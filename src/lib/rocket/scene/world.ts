/**
 * Everything in the trip that is not a rocket: the sky and the stars, the
 * Earth from the launch pad to the whole globe, the clouds, the launch tower
 * and its catching arms, the Moon and its craters, and the paths flown.
 *
 * Each is drawn in the world's own metres through the camera, so one drawing
 * serves every zoom: the coast the rocket crosses at lift-off is the same
 * land that shows as a patch on the globe from orbit.
 */

import { circle, rng, smooth, type Pt } from '@/lib/sketchbook/geometry';
import { colourIn, fill, label, shade, sketch } from '@/lib/sketch/pencil';
import { EARTH, MOON } from '../mission/bodies';
import type { Palette } from '../palette';
import { reach, toPage, type View } from './camera';

/* ------------------------------------------------------------------ *
 * Colour
 * ------------------------------------------------------------------ */

function rgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Part-way from colour `a` to `b`. */
export function mix(a: string, b: string, u: number): string {
  const [ar, ag, ab] = rgb(a);
  const [br, bg, bb] = rgb(b);
  const k = Math.max(0, Math.min(1, u));
  return `rgb(${Math.round(ar + (br - ar) * k)}, ${Math.round(ag + (bg - ag) * k)}, ${Math.round(ab + (bb - ab) * k)})`;
}

/* ------------------------------------------------------------------ *
 * Sky and stars
 * ------------------------------------------------------------------ */

/** How much air lies above the camera's view, 0 (space) to 1 (the ground). */
export function airAt(height: number, viewMetres: number): number {
  if (viewMetres > 3_000_000) return 0;
  return Math.pow(Math.max(0, 1 - height / 80_000), 1.4);
}

export function drawSky(ctx: CanvasRenderingContext2D, v: View, pal: Palette, air: number, seed: number) {
  const sky = ctx.createLinearGradient(0, v.h, 0, 0);
  sky.addColorStop(0, mix(pal.space, pal.sky, air));
  sky.addColorStop(1, mix(pal.space, pal.skyHigh, air * air));
  ctx.fillStyle = sky;
  ctx.globalAlpha = 0.55;
  ctx.fillRect(0, 0, v.w, v.h);
  ctx.globalAlpha = 1;
  // Stars come out as the air thins.
  const stars = 1 - air * 1.6;
  if (stars <= 0) return;
  const r = rng(1729);
  const count = Math.round((v.w * v.h) / 3600);
  for (let i = 0; i < count; i += 1) {
    const x = r() * v.w;
    const y = r() * v.h;
    const s = 1.4 + r() * 2.4;
    sketch(ctx, [{ x: x - s, y }, { x: x + s, y }], { seed: seed + i * 3, color: pal.star, width: 1.3, jitter: 0.3, alpha: stars });
    sketch(ctx, [{ x, y: y - s }, { x, y: y + s }], { seed: seed + i * 3 + 1, color: pal.star, width: 1.3, jitter: 0.3, alpha: stars });
  }
}

/* ------------------------------------------------------------------ *
 * Round bodies: the Earth and the Moon
 * ------------------------------------------------------------------ */

type Round = { cx: number; cy: number; r: number };

/** Points round a body at radius `r − depth`, from angle `a0` to `a1` (clockwise from its top), on the page. */
function arc(v: View, b: Round, a0: number, a1: number, n: number, depth = 0): Pt[] {
  const pts: Pt[] = [];
  const r = b.r - depth;
  for (let i = 0; i <= n; i += 1) {
    const a = a0 + ((a1 - a0) * i) / n;
    pts.push(toPage(v, b.cx + r * Math.sin(a), b.cy + r * Math.cos(a)));
  }
  return pts;
}

/**
 * The part of a body's rim worth drawing: all of it when the body is small on
 * the page, otherwise the stretch round the angle the view looks down on.
 */
function span(v: View, b: Round): { whole: boolean; a0: number; a1: number } {
  if (b.r * v.scale < 1.6 * Math.max(v.w, v.h)) return { whole: true, a0: 0, a1: 2 * Math.PI };
  const mid = Math.atan2(v.x - b.cx, v.y - b.cy);
  const half = Math.min(Math.PI, (reach(v) / b.r) * 0.8 + 0.001);
  return { whole: false, a0: mid - half, a1: mid + half };
}

function onPage(v: View, b: Round): boolean {
  const c = toPage(v, b.cx, b.cy);
  const r = b.r * v.scale;
  return c.x + r > -20 && c.x - r < v.w + 20 && c.y + r > -20 && c.y - r < v.h + 20;
}

/**
 * The Earth's land, as stretches of its rim (radians clockwise from the top,
 * where the launch pad is) and how far inland each is drawn on the globe.
 * The first is the coast the rocket launches from: land to the west, and the
 * sea it flies out over starting 4 km east of the pad.
 */
const LANDS: readonly { from: number; to: number; depth: number }[] = [
  { from: -0.42, to: 4_000 / EARTH.radius, depth: 0.42 },
  { from: 0.95, to: 1.55, depth: 0.34 },
  { from: 2.3, to: 3.05, depth: 0.5 },
  { from: 3.7, to: 4.35, depth: 0.3 },
  { from: 5.05, to: 5.5, depth: 0.28 },
];

/**
 * A body too small on the page to draw properly — the Earth and the Moon seen
 * from between them — as a small coloured disc, so it is still there to see.
 */
function dot(ctx: CanvasRenderingContext2D, v: View, pal: Palette, b: Round, colour: string, least: number, seed: number): boolean {
  if (b.r * v.scale >= least) return false;
  const c = toPage(v, b.cx, b.cy);
  const disc = circle(c, least, 24);
  fill(ctx, disc, colour, 0.85);
  sketch(ctx, disc, { seed, color: pal.charcoal, width: 1.4, jitter: 0.3, closed: true });
  return true;
}

export function drawEarth(ctx: CanvasRenderingContext2D, v: View, pal: Palette, seed: number) {
  const earth: Round = { cx: 0, cy: 0, r: EARTH.radius };
  if (!onPage(v, earth)) return;
  if (dot(ctx, v, pal, earth, pal.ocean, 11, seed + 801)) return;
  const s = span(v, earth);
  const deep = Math.min(earth.r, reach(v) * 2);
  const rim = s.whole ? arc(v, earth, 0, 2 * Math.PI, 120) : arc(v, earth, s.a0, s.a1, 72);
  const body = s.whole ? rim : [...rim, ...arc(v, earth, s.a1, s.a0, 8, deep)];

  // A halo of air round the globe.
  if (s.whole) fill(ctx, arc(v, { ...earth, r: earth.r + 90_000 }, 0, 2 * Math.PI, 120), pal.air, 0.55);
  fill(ctx, body, pal.paper);
  const anchor = toPage(v, 0, 0);
  shade(ctx, body, pal.ocean, 6, 1, seed, anchor);

  for (const [i, l] of LANDS.entries()) {
    const a0 = Math.max(l.from, s.a0);
    const a1 = Math.min(l.to, s.a1);
    if (a1 <= a0 && !s.whole) continue;
    const from = s.whole ? l.from : a0;
    const to = s.whole ? l.to : a1;
    const inland = Math.min(l.depth * earth.r, deep);
    const coast = arc(v, earth, from, to, s.whole ? 24 : 48);
    let shape: Pt[];
    if (s.whole) {
      // On the globe: a rounded patch reaching inland, deepest in the middle,
      // its edge wandering a little so it reads as land, not a slice.
      const wobble = rng(40 + i);
      const inner: Pt[] = [];
      for (let k = 12; k >= 0; k -= 1) {
        const u = k / 12;
        const a = from + (to - from) * u;
        const d = inland * Math.pow(Math.sin(Math.PI * u), 0.6) * (0.9 + wobble() * 0.2);
        inner.push(toPage(v, (earth.r - d) * Math.sin(a), (earth.r - d) * Math.cos(a)));
      }
      shape = smooth([...coast, ...inner], 4, true);
    } else {
      shape = [...coast, ...arc(v, earth, to, from, 10, inland)];
    }
    fill(ctx, shape, pal.paper);
    shade(ctx, shape, pal.land, 5, -1, seed, anchor);
  }
  sketch(ctx, rim, { seed: seed + 800, color: pal.charcoal, width: 2.2, jitter: 0.7, closed: s.whole });
}

/** A few craters, as angle round the Moon, distance from its centre and size, all as fractions. */
const CRATERS: readonly [number, number, number][] = [
  [0.4, 0.55, 0.13], [1.9, 0.3, 0.09], [2.6, 0.7, 0.16], [3.9, 0.45, 0.11], [5.2, 0.62, 0.08], [4.6, 0.2, 0.06], [1.1, 0.8, 0.07],
];

export function drawMoon(ctx: CanvasRenderingContext2D, v: View, pal: Palette, moon: { x: number; y: number }, site: { x: number; y: number } | null, seed: number) {
  const body: Round = { cx: moon.x, cy: moon.y, r: MOON.radius };
  if (!onPage(v, body)) return;
  if (dot(ctx, v, pal, body, pal.moon, 6, seed + 951)) return;
  const s = span(v, body);
  const deep = Math.min(body.r, reach(v) * 2);
  const rim = s.whole ? arc(v, body, 0, 2 * Math.PI, 96) : arc(v, body, s.a0, s.a1, 72);
  const shape = s.whole ? rim : [...rim, ...arc(v, body, s.a1, s.a0, 8, deep)];
  fill(ctx, shape, pal.paper);
  shade(ctx, shape, pal.moon, 6, -1, seed, toPage(v, moon.x, moon.y));
  if (s.whole) {
    const c = toPage(v, moon.x, moon.y);
    const R = body.r * v.scale;
    CRATERS.forEach(([a, d, size], i) => {
      const crater = circle({ x: c.x + Math.sin(a) * d * R, y: c.y - Math.cos(a) * d * R }, size * R, 16);
      fill(ctx, crater, pal.moonShade, 0.5);
      sketch(ctx, crater, { seed: seed + 910 + i, color: pal.charcoal, width: 1, jitter: 0.4, alpha: 0.5, closed: true });
    });
  } else if (site) {
    // Close to the ground: craters and rocks round the landing site, to scale.
    const at = Math.atan2(site.x, site.y);
    [[-420, 70], [-160, 26], [210, 42], [520, 95], [900, 60], [-800, 110]].forEach(([along, size], i) => {
      const a = at + along / body.r;
      const p = toPage(v, moon.x + body.r * Math.sin(a), moon.y + body.r * Math.cos(a));
      const w = size * v.scale;
      if (w < 2 || p.x < -w || p.x > v.w + w) return;
      const bowl = circle(p, w, 18).map((q) => ({ x: q.x, y: p.y + (q.y - p.y) * 0.22 }));
      fill(ctx, bowl, pal.moonShade, 0.7);
      sketch(ctx, bowl, { seed: seed + 930 + i, color: pal.charcoal, width: 1.1, jitter: 0.4, alpha: 0.7, closed: true });
    });
  }
  sketch(ctx, rim, { seed: seed + 950, color: pal.charcoal, width: 2, jitter: 0.6, closed: s.whole });
}

/* ------------------------------------------------------------------ *
 * Near the ground: clouds, height marks, the launch tower
 * ------------------------------------------------------------------ */

/** Clouds over the launch site: how far east of the pad, how high, how wide, metres. */
const CLOUDS: readonly [number, number, number][] = [
  [-2_500, 2_200, 1_100], [1_500, 3_200, 1_600], [6_000, 5_500, 2_200], [-7_000, 7_000, 2_600],
  [12_000, 8_500, 3_000], [20_000, 4_200, 2_400], [30_000, 9_000, 3_600], [-15_000, 3_800, 2_000],
];

export function drawClouds(ctx: CanvasRenderingContext2D, v: View, pal: Palette, seed: number) {
  if (reach(v) > 400_000) return;
  CLOUDS.forEach(([east, high, wide], i) => {
    const a = east / EARTH.radius;
    const r = EARTH.radius + high;
    const c = toPage(v, r * Math.sin(a), r * Math.cos(a));
    const size = (wide / 2) * v.scale;
    if (size < 3 || c.x < -size * 2 || c.x > v.w + size * 2 || c.y < -size || c.y > v.h + size) return;
    const outline: Pt[] = [];
    [-0.9, -0.3, 0.3, 0.9].forEach((u, k) => {
      const rr = size * (k === 1 || k === 2 ? 0.42 : 0.3);
      outline.push(...circle({ x: c.x + u * size * 0.55, y: c.y - rr * 0.4 }, rr, 20, Math.PI).slice(0, 11));
    });
    const shape = [...outline, { x: c.x + size * 0.95, y: c.y }, { x: c.x - size * 0.95, y: c.y }];
    fill(ctx, shape, pal.cloud, 0.95);
    sketch(ctx, shape, { seed: seed + 400 + i, color: pal.window, width: 1.2, jitter: 0.6, alpha: 0.55, closed: true });
  });
}

/** Dashed rings round the Earth at heights worth knowing, labelled where they cross the page. */
export function drawHeights(ctx: CanvasRenderingContext2D, v: View, pal: Palette, marks: readonly { km: number; label: string }[], seed: number) {
  if (reach(v) > 3_000_000) return;
  const small = v.w < 520 ? 12 : 14;
  marks.forEach((m, i) => {
    const ring: Round = { cx: 0, cy: 0, r: EARTH.radius + m.km * 1000 };
    const s = span(v, ring);
    const pts = s.whole ? arc(v, ring, 0, 2 * Math.PI, 120) : arc(v, ring, s.a0, s.a1, 60);
    const shown = pts.filter((p) => p.x > 0 && p.x < v.w && p.y > 0 && p.y < v.h);
    if (shown.length < 2) return;
    ctx.setLineDash([3, 7]);
    sketch(ctx, pts, { seed: seed + 500 + i, color: pal.mark, width: 1.2, jitter: 0.4, alpha: 0.7, closed: s.whole });
    ctx.setLineDash([]);
    const right = shown.reduce((a, b) => (b.x > a.x ? b : a));
    label(ctx, m.label, Math.min(v.w - 8, right.x) , right.y - small * 0.9, pal, { size: small, color: pal.mark, align: 'right' });
  });
}

/** The tower's parts, in metres from the pad: east, up. */
const TOWER = { west: -30, east: -18, height: 146, arms: 90, armLength: 26 } as const;

/**
 * The launch tower beside the pad, with its two catching arms. `closed` runs
 * from 0 (arms swung open, as at launch) to 1 (closed round a booster).
 */
export function drawTower(ctx: CanvasRenderingContext2D, v: View, pal: Palette, closed: number, seed: number) {
  const at = (east: number, up: number) => toPage(v, east, EARTH.radius + up);
  const base = at(0, 0);
  if (reach(v) > 20_000 || base.x < -v.w || base.x > 2 * v.w || base.y < -v.h || base.y > 2 * v.h) return;
  const o = { color: pal.charcoal, width: 1.5, jitter: 0.4 };
  // The pad, with a trench under the rocket for the engines' blast.
  const slab = [at(-40, 0), at(34, 0), at(34, -3), at(-40, -3)];
  fill(ctx, slab, pal.metal, 0.6);
  sketch(ctx, slab, { ...o, seed: seed + 1, closed: true });
  const trench = [at(-7, 0.5), at(7, 0.5), at(9, -26), at(-9, -26)];
  colourIn(ctx, trench, pal.charcoal, seed + 5, 2.5);
  sketch(ctx, trench, { ...o, seed: seed + 6, closed: true });
  // The tower: two legs and a lattice between them.
  const { west, east, height } = TOWER;
  const frame = [at(west, 0), at(west, height), at(east, height), at(east, 0)];
  fill(ctx, frame, pal.metal, 0.25);
  sketch(ctx, [at(west, 0), at(west, height)], { ...o, seed: seed + 2, width: 1.8 });
  sketch(ctx, [at(east, 0), at(east, height)], { ...o, seed: seed + 3, width: 1.8 });
  for (let y = 0, i = 0; y < height; y += 12, i += 1) {
    sketch(ctx, [at(west, y), at(east, y + 12)], { ...o, width: 0.9, alpha: 0.7, seed: seed + 10 + i });
    sketch(ctx, [at(west, y + 12), at(east, y)], { ...o, width: 0.9, alpha: 0.7, seed: seed + 60 + i });
  }
  // The arms ("chopsticks"): swung up and away while open, level round the booster when closed.
  const lift = (1 - closed) * 0.6;
  [0, 5].forEach((dy, i) => {
    const pivot = { e: east, u: TOWER.arms + dy };
    const tip = { e: east + TOWER.armLength * Math.cos(lift), u: pivot.u + TOWER.armLength * Math.sin(lift) };
    const arm = [at(pivot.e, pivot.u - 1.5), at(tip.e, tip.u - 1.5), at(tip.e, tip.u + 1.5), at(pivot.e, pivot.u + 1.5)];
    colourIn(ctx, arm, pal.charcoal, seed + 120 + i, 2);
    sketch(ctx, arm, { ...o, seed: seed + 130 + i, closed: true });
  });
}

/* ------------------------------------------------------------------ *
 * Paths
 * ------------------------------------------------------------------ */

/** A flown path, as world points, pencilled through the camera (points closer than a few pixels merged). */
export function drawPath(ctx: CanvasRenderingContext2D, v: View, points: readonly { x: number; y: number }[], colour: string, seed: number, dashed = false) {
  const out: Pt[] = [];
  let last: Pt | null = null;
  for (const q of points) {
    const p = toPage(v, q.x, q.y);
    if (!last || Math.hypot(p.x - last.x, p.y - last.y) > 3) out.push(p);
    last = out[out.length - 1];
  }
  if (out.length < 2) return;
  if (dashed) ctx.setLineDash([4, 6]);
  sketch(ctx, out, { seed, color: colour, width: 1.8, jitter: 0.35, alpha: 0.85 });
  if (dashed) ctx.setLineDash([]);
}
