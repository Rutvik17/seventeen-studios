/**
 * One frame of the trip: where the camera is, and everything it sees.
 *
 * The camera follows a list of shots, each tied to a stretch of playback —
 * the pad, the climb, the globe, the refuel close-up, the burn, the three
 * days out, the Moon, the landing — and eases from one to the next. The
 * booster's trip home has its own camera, in a split view.
 */

import { BOOSTER, SHIP } from '../mission/vehicle';
import { EARTH, MOON, moonAt } from '../mission/bodies';
import { gravityAt } from '../physics';
import { between, shipAt, stateAt, type Timeline } from '../mission/timeline';
import type { Mission, Sample } from '../mission/mission';
import type { Palette } from '../palette';
import { angleOf, blend, frameOn, reach, smoothstep, toPage, type Camera, type View } from './camera';
import { drawCraft, LENGTH, type CraftKind } from './craft';
import { airAt, drawClouds, drawEarth, drawHeights, drawMoon, drawPath, drawSky, drawTower } from './world';
import { arrow, label, sketch } from '@/lib/sketch/pencil';
import { circle } from '@/lib/sketchbook/geometry';

export type Words = {
  heights: readonly { km: number; label: string }[];
  earth: string;
  moon: string;
  arrows: { push: string; pull: string };
};

type Shot = { from: number; camera: (t: number) => Camera };

/** Seconds of playback over which one shot eases into the next. */
const EASE = 1.4;

function heightAboveMoon(m: Mission, s: Sample) {
  const moon = moonAt(s.t, m.moonPhase);
  return Math.hypot(s.x - moon.x, s.y - moon.y) - MOON.radius;
}

/** The camera shots of the trip, for a page `w` × `h`. */
export function shotsFor(m: Mission, tl: Timeline, w: number, h: number): Shot[] {
  const short = Math.min(w, h);
  const e = m.events;
  const at = (t: number) => shipAt(m, t);
  const up = (s: { x: number; y: number }) => angleOf(s.x, s.y);
  const globeTurn = up(at(e.orbit));
  const arrival = moonAt(e.perilune, m.moonPhase);
  // Lay the three days out with the Moon to the right of the Earth.
  const coastTurn = angleOf(arrival.x, arrival.y) - Math.PI / 2;
  const P = (id: keyof Mission['events']) => tl.playbackAt(e[id]);

  return [
    {
      // On the pad: the rocket and the tower, filling the page.
      from: -Infinity,
      camera: (t) => {
        const s = at(t);
        return frameOn(s.x, s.y, 330, up(s), short, 0.5, 0.84);
      },
    },
    {
      // The climb: follow it up, pulling back as it rises so the curve of the Earth comes into view.
      from: 1.2,
      camera: (t) => {
        const s = at(t);
        const hgt = Math.hypot(s.x, s.y) - EARTH.radius;
        const metres = Math.min(480_000, 330 + hgt * 3.2);
        // Keep the ground in view for the first stretch, then centre on the rocket.
        const ay = 0.84 - 0.39 * smoothstep(hgt / 15_000);
        return frameOn(s.x, s.y, metres, up(s), short, 0.5, ay);
      },
    },
    {
      // In orbit: the whole globe, the ship going round it.
      from: P('orbit') - 0.5,
      camera: () => frameOn(0, 0, 2.9 * EARTH.radius, globeTurn, short),
    },
    {
      // The refuel: the two ships, with the curve of the Earth below them.
      from: P('docked') - 0.2,
      camera: (t) => {
        const s = at(t);
        return frameOn(s.x, s.y, 700_000, up(s), short, 0.5, 0.38);
      },
    },
    {
      // The Moon burn: back out to the globe.
      from: P('refuelled') + 0.3,
      camera: () => frameOn(0, 0, 3.8 * EARTH.radius, globeTurn, short),
    },
    {
      // Three days out: the Earth and the Moon together.
      from: P('moonBurnEnd') + 0.3,
      camera: (t) => {
        const moon = moonAt(t, m.moonPhase);
        return frameOn(moon.x * 0.5, moon.y * 0.5, 1.3 * Math.hypot(moon.x, moon.y), coastTurn, short);
      },
    },
    {
      // Arriving: the Moon, close enough to see the ship go round it.
      from: P('perilune') - 1.8,
      camera: (t) => {
        const moon = moonAt(t, m.moonPhase);
        return frameOn(moon.x, moon.y, 10 * MOON.radius, coastTurn, short);
      },
    },
    {
      // The landing: follow it down, closing in as it nears the ground.
      from: P('descent') - 0.4,
      camera: (t) => {
        const s = at(t);
        const moon = moonAt(t, m.moonPhase);
        const hgt = heightAboveMoon(m, s);
        const metres = Math.max(260, Math.min(150_000, 260 + hgt * 2.6));
        return frameOn(s.x, s.y, metres, angleOf(s.x - moon.x, s.y - moon.y), short, 0.5, 0.5 - 0.12 * smoothstep(1 - hgt / 2000));
      },
    },
  ];
}

/** The camera at playback second `p` (mission time `t`), easing between shots. */
export function cameraAt(shots: Shot[], p: number, t: number, reduced: boolean): Camera {
  let i = 0;
  while (i + 1 < shots.length && p >= shots[i + 1].from) i += 1;
  const here = shots[i].camera(t);
  const next = shots[i + 1];
  if (!next || reduced) return here;
  const u = (p - (next.from - EASE)) / EASE;
  return u > 0 ? blend(here, next.camera(t), smoothstep(u)) : here;
}

/** The booster's own camera, for the split view. */
export function boosterCamera(m: Mission, t: number, w: number, h: number): Camera {
  const s = stateAt(m.booster, t);
  const hgt = Math.hypot(s.x, s.y) - EARTH.radius;
  const metres = Math.max(320, Math.min(160_000, 320 + hgt * 2.2));
  return frameOn(s.x, s.y, metres, angleOf(s.x, s.y), Math.min(w, h), 0.5, 0.62);
}

/* ------------------------------------------------------------------ *
 * Drawing
 * ------------------------------------------------------------------ */

/** A craft on the page: never smaller than a readable size, however far out the camera is. */
function craft(
  ctx: CanvasRenderingContext2D,
  v: View,
  pal: Palette,
  kind: CraftKind,
  s: Sample,
  look: { throttle: number; fuel: number; shipFuel?: number; legs?: number },
  seed: number,
  t: number,
  offset = 0,
) {
  const short = Math.min(v.w, v.h);
  const far = reach(v);
  const least = far > 5_000_000 ? short * 0.05 : far > 20_000 ? short * 0.12 : 0;
  const px = Math.max(LENGTH[kind] * v.scale, least);
  // `offset` metres along the nose: the ship rides on top of the booster.
  const base = toPage(v, s.x + Math.sin(s.nose) * offset * (px / (LENGTH[kind] * v.scale)), s.y + Math.cos(s.nose) * offset * (px / (LENGTH[kind] * v.scale)));
  if (base.x < -px * 2 || base.x > v.w + px * 2 || base.y < -px * 2 || base.y > v.h + px * 2) return;
  drawCraft(ctx, pal, kind, base, s.nose - v.rot, px, { ...look, seed, t });
}

const shipFuel = (s: Sample) => Math.max(0, (s.m - SHIP.dry) / SHIP.fuel);
const boosterFuel = (s: Sample) => Math.max(0, (s.m - BOOSTER.dry) / BOOSTER.fuel);
const stackFuel = (s: Sample) => Math.max(0, (s.m - SHIP.dry - SHIP.fuel - BOOSTER.dry) / BOOSTER.fuel);

/** Where the ship's path is drawn from, for the part of the trip on the page. */
function pathFrom(m: Mission, t: number): number {
  const e = m.events;
  if (t < e.orbit) return 0;
  if (t < e.moonBurn) return e.orbit - 90;
  if (t < e.perilune - 3 * 3600) return e.moonBurn;
  if (t < e.descent) return e.perilune - 3 * 3600;
  return e.descent;
}

export function renderMain(
  ctx: CanvasRenderingContext2D,
  v: View,
  pal: Palette,
  m: Mission,
  t: number,
  words: Words,
  seed: number,
  flicker: number,
  started: boolean,
) {
  const e = m.events;
  const moon = moonAt(t, m.moonPhase);
  const nearMoon = Math.hypot(v.x - moon.x, v.y - moon.y) < 30 * MOON.radius;
  drawSky(ctx, v, pal, nearMoon ? 0 : airAt(Math.hypot(v.x, v.y) - EARTH.radius, reach(v)), seed);
  drawEarth(ctx, v, pal, seed);
  drawHeights(ctx, v, pal, words.heights, seed);
  drawClouds(ctx, v, pal, seed);
  drawTower(ctx, v, pal, smoothstep((t - (e.caught - 4)) / 3), seed);
  drawMoon(ctx, v, pal, moon, m.site, seed);

  const far = reach(v);
  if (far > 5_000_000) {
    const small = v.w < 520 ? 13 : 16;
    const ep = toPage(v, 0, 0);
    label(ctx, words.earth, ep.x, ep.y + EARTH.radius * v.scale + small + 6, pal, { size: small, color: pal.charcoal, align: 'center' });
    const mp = toPage(v, moon.x, moon.y);
    label(ctx, words.moon, mp.x, mp.y + Math.max(8, MOON.radius * v.scale) + small + 4, pal, { size: small, color: pal.charcoal, align: 'center' });
  }

  // The ship's path: in the Moon's own frame once near it, so its orbit reads as a loop.
  const from = pathFrom(m, t);
  const path = between(m.ship, from, t);
  const aroundMoon = t > e.perilune - 3 * 3600;
  const pts = aroundMoon
    ? path.map((s) => {
        const mm = moonAt(s.t, m.moonPhase);
        return { x: s.x - mm.x + moon.x, y: s.y - mm.y + moon.y };
      })
    : path;
  if (far > 2_000) drawPath(ctx, v, [...pts, shipAt(m, Math.min(t, e.touchdown))], pal.flame, seed + 40, t > e.orbit);

  // The booster, while it is near — not once it is home and the camera has pulled away.
  if (t >= e.separation && (t < e.caught || far < 30_000)) {
    const b = stateAt(m.booster, Math.min(t, e.caught));
    craft(ctx, v, pal, 'booster', b, { throttle: t < e.caught ? b.throttle : 0, fuel: boosterFuel(b) }, seed + 100, flicker);
  }

  const s = shipAt(m, t);
  // The tanker: comes up behind, docks tail to tail, fills the tanks, leaves.
  if (t > e.docked - 900 && t < e.refuelled + 900) {
    const gap = t < e.docked ? 3 + (e.docked - t) * 0.12 : t > e.refuelled ? 3 + (t - e.refuelled) * 0.12 : 3;
    // Facing the other way, `gap` metres behind the ship's engines.
    craft(ctx, v, pal, 'tanker', { ...s, nose: s.nose + Math.PI }, { throttle: 0, fuel: 0 }, seed + 200, flicker, gap);
  }

  const moonHeight = t > e.descent ? heightAboveMoon(m, s) : Infinity;
  const legs = t >= e.touchdown ? 1 : Math.max(0, Math.min(1, (400 - moonHeight) / 250));
  // Moon dust, thrown sideways by the engine in the last few metres.
  if (t > e.descent && moonHeight < 40 && s.throttle > 0.01) {
    const base = toPage(v, s.x, s.y);
    const k = v.scale;
    for (let i = 0; i < 4; i += 1) {
      const r = (12 + i * 10 + ((flicker * 30) % 10)) * k;
      const arc = circle(base, r, 20, Math.PI).slice(0, 11).map((p) => ({ x: p.x, y: base.y - (base.y - p.y) * 0.25 }));
      sketch(ctx, arc, { seed: seed + 300 + i, color: pal.moonShade, width: 1.4, jitter: 0.8, alpha: 0.7 * (1 - moonHeight / 40) });
    }
  }
  if (t < e.separation) {
    // Before lift-off the engines are not lit.
    const throttle = started ? s.throttle : 0;
    craft(ctx, v, pal, 'stack', s, { throttle, fuel: stackFuel(s), shipFuel: 1 }, seed + 300, flicker);
    forces(ctx, v, pal, s, throttle, words, seed);
  } else {
    craft(ctx, v, pal, 'ship', s, { throttle: s.throttle, fuel: shipFuel(s), legs }, seed + 300, flicker, t < e.orbit ? BOOSTER.length : 0);
  }
}

/**
 * Push and pull, to scale with each other, beside the rocket while it is
 * still near the ground: the engines' push up from the base, gravity's pull
 * down from the middle. While the orange arrow is the longer, it speeds up.
 */
function forces(ctx: CanvasRenderingContext2D, v: View, pal: Palette, s: Sample, throttle: number, words: Words, seed: number) {
  if (reach(v) > 20_000) return;
  const pull = s.m * gravityAt(Math.hypot(s.x, s.y) - EARTH.radius);
  const push = BOOSTER.thrust * throttle;
  const tall = LENGTH.stack * v.scale;
  const perNewton = (tall * 0.55) / BOOSTER.thrust;
  // Which way the rocket points on the page, and which way is beside it.
  const base = toPage(v, s.x, s.y);
  const tip = toPage(v, s.x + Math.sin(s.nose), s.y + Math.cos(s.nose));
  const len = Math.hypot(tip.x - base.x, tip.y - base.y) || 1;
  const u = { x: (tip.x - base.x) / len, y: (tip.y - base.y) / len };
  const n = { x: -u.y, y: u.x };
  const gap = (BOOSTER.diameter / 2) * v.scale + 12;
  const small = v.w < 520 ? 12 : 14;
  const mid = { x: base.x + u.x * tall * 0.5 + n.x * gap, y: base.y + u.y * tall * 0.5 + n.y * gap };
  const pullEnd = { x: mid.x - u.x * pull * perNewton, y: mid.y - u.y * pull * perNewton };
  arrow(ctx, mid, pullEnd, pal.pull, seed + 700);
  label(ctx, words.arrows.pull, pullEnd.x + n.x * 10, pullEnd.y + n.y * 10, pal, { size: small, color: pal.pull });
  if (push > 0) {
    const foot = { x: base.x + n.x * (gap + 14), y: base.y + n.y * (gap + 14) };
    const pushEnd = { x: foot.x + u.x * push * perNewton, y: foot.y + u.y * push * perNewton };
    arrow(ctx, foot, pushEnd, pal.push, seed + 710);
    label(ctx, words.arrows.push, pushEnd.x + n.x * 10, pushEnd.y + n.y * 10, pal, { size: small, color: pal.push });
  }
}

/** The split view: the booster's trip home, down to the tower's arms. */
export function renderBooster(ctx: CanvasRenderingContext2D, v: View, pal: Palette, m: Mission, t: number, words: Words, seed: number, flicker: number) {
  const e = m.events;
  drawSky(ctx, v, pal, airAt(Math.hypot(v.x, v.y) - EARTH.radius, reach(v)), seed);
  drawEarth(ctx, v, pal, seed);
  drawHeights(ctx, v, pal, words.heights, seed);
  drawClouds(ctx, v, pal, seed);
  drawTower(ctx, v, pal, smoothstep((t - (e.caught - 4)) / 3), seed);
  const b = stateAt(m.booster, Math.min(t, e.caught));
  craft(ctx, v, pal, 'booster', b, { throttle: t < e.caught ? b.throttle : 0, fuel: boosterFuel(b) }, seed + 100, flicker);
  // Its path home.
  drawPath(ctx, v, [...between(m.booster, e.separation, Math.min(t, e.caught)), b], pal.mark, seed + 50, true);
}
