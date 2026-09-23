/**
 * The rocket entry's drawing, in coloured pencil, on a 2D canvas.
 *
 * Every line goes through `sketch`: the points are nudged by a seeded wobble
 * and drawn twice, a firm pass and a faint one, the way a pencil goes back over
 * a line. The page re-seeds the wobble ten times a second, so the drawing
 * "boils" like stop-motion pencil animation — and holds it still for anyone
 * who has asked for reduced motion. Colour goes on as a wash with pencil
 * strokes over it, so it reads as coloured pencil rather than flat fill.
 *
 * The colours are the drawing's own, declared as `--rocket-*` on the entry and
 * read back once; they do not leak into the interface.
 */

import { circle, rng, smooth, type Pt } from '@/lib/sketchbook/geometry';
import { NOZZLE_HALF_WIDTH, rocketParts } from './shape';

export type Palette = {
  charcoal: string;
  muted: string;
  paper: string;
  /** The handwriting face's CSS font-family. */
  hand: string;
  sky: string;
  skyHigh: string;
  space: string;
  ocean: string;
  land: string;
  air: string;
  cloud: string;
  star: string;
  body: string;
  red: string;
  window: string;
  /** Nozzle, pad and gantry. */
  metal: string;
  flame: string;
  flameMid: string;
  flameCore: string;
  smoke: string;
  dust: string;
  push: string;
  pull: string;
  mark: string;
};

/** The custom property each colour is read from, on the entry's container. */
export const PALETTE_VARS: Record<Exclude<keyof Palette, 'hand' | 'charcoal' | 'muted' | 'paper'>, string> = {
  sky: '--rocket-sky',
  skyHigh: '--rocket-sky-high',
  space: '--rocket-space',
  ocean: '--rocket-ocean',
  land: '--rocket-land',
  air: '--rocket-air',
  cloud: '--rocket-cloud',
  star: '--rocket-star',
  body: '--rocket-body',
  red: '--rocket-red',
  window: '--rocket-window',
  metal: '--rocket-metal',
  flame: '--rocket-flame',
  flameMid: '--rocket-flame-mid',
  flameCore: '--rocket-flame-core',
  smoke: '--rocket-smoke',
  dust: '--rocket-dust',
  push: '--rocket-push',
  pull: '--rocket-pull',
  mark: '--rocket-mark',
};

export type Layout = {
  w: number;
  h: number;
  /** The top of the Earth, where the pad stands. */
  groundY: number;
  topY: number;
  rocketX: number;
  rocketH: number;
  rulerX: number;
  earth: { cx: number; cy: number; r: number };
};

/** Height at which the rocket has left the top of the drawing, metres. */
export const EXIT_HEIGHT = 40_000_000;

export function layoutFor(w: number, h: number): Layout {
  const groundY = h - Math.max(44, h * 0.13);
  const rocketH = Math.max(52, Math.min(118, h * 0.17));
  const r = Math.max(w, h) * 1.6;
  return {
    w,
    h,
    groundY,
    topY: 16,
    rocketX: w * 0.56,
    rocketH,
    rulerX: 14,
    earth: { cx: w / 2, cy: groundY + r, r },
  };
}

/**
 * Where the nozzle is drawn at `m` metres up. Logarithmic — each step up the
 * ruler is ten times higher than the last — so lift-off and 10,000 km both fit
 * on one page. At `EXIT_HEIGHT` the nose has just left the top.
 */
export function heightToY(L: Layout, m: number): number {
  const span = L.groundY - L.topY + L.rocketH * 1.05;
  return L.groundY - (span * Math.log1p(Math.max(0, m) / 1000)) / Math.log1p(EXIT_HEIGHT / 1000);
}

/* ------------------------------------------------------------------ *
 * Pencil
 * ------------------------------------------------------------------ */

type Stroke = {
  seed: number;
  color: string;
  width: number;
  /** How far, in px, each point may wander. */
  jitter?: number;
  alpha?: number;
  closed?: boolean;
};

/** Points every `step` px along `pts`, so the wobble follows long straight lines too. */
function densify(pts: Pt[], step: number): Pt[] {
  const out: Pt[] = [pts[0]];
  for (let i = 1; i < pts.length; i += 1) {
    const a = pts[i - 1];
    const b = pts[i];
    const n = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / step));
    for (let k = 1; k <= n; k += 1) out.push({ x: a.x + ((b.x - a.x) * k) / n, y: a.y + ((b.y - a.y) * k) / n });
  }
  return out;
}

export function sketch(ctx: CanvasRenderingContext2D, pts: Pt[], s: Stroke) {
  if (pts.length < 2) return;
  const rand = rng(s.seed);
  const line = densify(s.closed ? [...pts, pts[0]] : pts, 7);
  const jitter = s.jitter ?? 0.9;
  ctx.strokeStyle = s.color;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (let pass = 0; pass < 2; pass += 1) {
    const j = jitter * (pass ? 1.5 : 1);
    ctx.globalAlpha = (s.alpha ?? 1) * (pass ? 0.35 : 0.9);
    ctx.lineWidth = s.width * (pass ? 0.6 : 1);
    const p = line.map((q) => ({ x: q.x + (rand() - 0.5) * 2 * j, y: q.y + (rand() - 0.5) * 2 * j }));
    ctx.beginPath();
    ctx.moveTo(p[0].x, p[0].y);
    for (let i = 1; i < p.length - 1; i += 1) {
      ctx.quadraticCurveTo(p[i].x, p[i].y, (p[i].x + p[i + 1].x) / 2, (p[i].y + p[i + 1].y) / 2);
    }
    ctx.lineTo(p[p.length - 1].x, p[p.length - 1].y);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

function trace(ctx: CanvasRenderingContext2D, pts: Pt[]) {
  ctx.beginPath();
  pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.closePath();
}

function fill(ctx: CanvasRenderingContext2D, pts: Pt[], color: string, alpha = 1) {
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  trace(ctx, pts);
  ctx.fill();
  ctx.globalAlpha = 1;
}

/** Parallel pencil strokes across `bounds`, at `angle`, drawn only inside the current clip. */
function hatch(
  ctx: CanvasRenderingContext2D,
  bounds: { x: number; y: number; w: number; h: number },
  gap: number,
  angle: number,
  s: Omit<Stroke, 'closed'>,
) {
  const reach = Math.hypot(bounds.w, bounds.h);
  const cx = bounds.x + bounds.w / 2;
  const cy = bounds.y + bounds.h / 2;
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);
  for (let k = -reach / 2, i = 0; k <= reach / 2; k += gap, i += 1) {
    const ox = cx - dy * k;
    const oy = cy + dx * k;
    sketch(ctx, [{ x: ox - (dx * reach) / 2, y: oy - (dy * reach) / 2 }, { x: ox + (dx * reach) / 2, y: oy + (dy * reach) / 2 }], {
      ...s,
      seed: s.seed + i * 7,
    });
  }
}

/** A shape coloured in: a wash of `color`, then pencil strokes of it on top. */
function colourIn(ctx: CanvasRenderingContext2D, pts: Pt[], color: string, seed: number, gap = 5, angle = -Math.PI / 4) {
  fill(ctx, pts, color, 0.55);
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  pts.forEach((p) => {
    x0 = Math.min(x0, p.x);
    y0 = Math.min(y0, p.y);
    x1 = Math.max(x1, p.x);
    y1 = Math.max(y1, p.y);
  });
  ctx.save();
  trace(ctx, pts);
  ctx.clip();
  hatch(ctx, { x: x0, y: y0, w: x1 - x0, h: y1 - y0 }, gap, angle, { seed, color, width: 1.1, jitter: 0.5, alpha: 0.7 });
  ctx.restore();
}

/** Handwriting with a paper-coloured halo, so it reads over any colour. */
function label(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, pal: Palette, o: { size: number; color: string; align?: CanvasTextAlign }) {
  ctx.font = `${o.size}px ${pal.hand}`;
  ctx.textAlign = o.align ?? 'left';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.lineWidth = 4;
  ctx.strokeStyle = pal.paper;
  ctx.globalAlpha = 0.85;
  ctx.strokeText(text, x, y);
  ctx.globalAlpha = 1;
  ctx.fillStyle = o.color;
  ctx.fillText(text, x, y);
}

/** "1,000" — the same grouping as the working beside the drawing. */
function group(n: number): string {
  return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/* ------------------------------------------------------------------ *
 * What does not move: sky, ruler, Earth, pad
 * ------------------------------------------------------------------ */

const RULER_KM = [1, 10, 100, 1_000, 10_000];

/** The curve of the Earth across the drawing. */
function earthSurface(L: Layout): Pt[] {
  const { cx, cy, r } = L.earth;
  const half = Math.asin(Math.min(1, (L.w / 2 + 40) / r));
  const surface: Pt[] = [];
  for (let i = 0; i <= 48; i += 1) {
    const a = -Math.PI / 2 - half + (2 * half * i) / 48;
    surface.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r });
  }
  return surface;
}

/** The coast of the land the pad stands on. */
function coast(L: Layout): Pt[] {
  return smooth(
    [
      { x: L.rocketX - L.rocketH * 1.6, y: L.groundY + 4 },
      { x: L.rocketX - L.rocketH * 0.9, y: L.groundY + L.rocketH * 0.28 },
      { x: L.rocketX + L.rocketH * 0.2, y: L.groundY + L.rocketH * 0.36 },
      { x: L.rocketX + L.rocketH * 1.3, y: L.groundY + L.rocketH * 0.22 },
      { x: L.rocketX + L.rocketH * 1.9, y: L.groundY + 4 },
    ],
    6,
  );
}

/**
 * The washes and textures under everything — sky, air, ocean, land — which
 * do not boil, so they are drawn once for each size of canvas rather than ten
 * times a second.
 */
export function drawBackdrop(ctx: CanvasRenderingContext2D, L: Layout, pal: Palette) {
  const seed = 1;
  const spaceY = heightToY(L, 100_000);

  // The sky: pale blue by the ground, deepening to the violet of space.
  const sky = ctx.createLinearGradient(0, L.groundY, 0, 0);
  sky.addColorStop(0, pal.sky);
  sky.addColorStop(Math.max(0.05, Math.min(0.95, (L.groundY - spaceY) / L.groundY)), pal.skyHigh);
  sky.addColorStop(1, pal.space);
  // Down to the bottom edge: the Earth is painted over it, and where the
  // Earth curves away at the sides the sky has to be there, not bare paper.
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, L.w, L.h);
  ctx.globalAlpha = 1;
  hatch(ctx, { x: 0, y: 0, w: L.w, h: L.h }, 7, -Math.PI / 6, { seed: seed + 10, color: pal.skyHigh, width: 1, jitter: 0.8, alpha: 0.18 });

  // The Earth: blue ocean, a green coast under the pad, a halo of air.
  const { cx, cy, r } = L.earth;
  const air = ctx.createLinearGradient(0, L.groundY - 22, 0, L.groundY);
  air.addColorStop(0, 'rgba(0,0,0,0)');
  air.addColorStop(1, pal.air);
  ctx.globalAlpha = 0.7;
  ctx.fillStyle = air;
  ctx.fillRect(0, L.groundY - 22, L.w, 24);
  ctx.globalAlpha = 1;

  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip();
  ctx.globalAlpha = 0.6;
  ctx.fillStyle = pal.ocean;
  ctx.fillRect(0, L.groundY - 10, L.w, L.h - L.groundY + 10);
  ctx.globalAlpha = 1;
  hatch(ctx, { x: 0, y: L.groundY - 10, w: L.w, h: L.h - L.groundY + 10 }, 6, Math.PI / 4, {
    seed: seed + 700, color: pal.ocean, width: 1.1, jitter: 0.8, alpha: 0.75,
  });
  const land = coast(L);
  const landShape = [...land, { x: L.rocketX + L.rocketH * 1.9, y: L.groundY - 20 }, { x: L.rocketX - L.rocketH * 1.6, y: L.groundY - 20 }];
  fill(ctx, landShape, pal.paper);
  colourIn(ctx, landShape, pal.land, seed + 760, 5, -Math.PI / 4);
  ctx.restore();
}

export function drawStill(
  ctx: CanvasRenderingContext2D,
  L: Layout,
  pal: Palette,
  seed: number,
  landmarks: readonly { km: number; label: string }[],
) {
  const small = L.w < 520 ? 12 : 14;
  const spaceY = heightToY(L, 100_000);

  // Stars, above where space begins.
  const stars = rng(1729);
  const count = Math.round((L.w * Math.max(0, spaceY - L.topY)) / 2400);
  for (let i = 0; i < count; i += 1) {
    const x = 60 + stars() * (L.w - 70);
    const y = L.topY + stars() * (spaceY - L.topY - 10);
    const s = 1.6 + stars() * 2.6;
    sketch(ctx, [{ x: x - s, y }, { x: x + s, y }], { seed: seed + i * 3, color: pal.star, width: 1.4, jitter: 0.3 });
    sketch(ctx, [{ x, y: y - s }, { x, y: y + s }], { seed: seed + i * 3 + 1, color: pal.star, width: 1.4, jitter: 0.3 });
  }

  // Two clouds, low down, where the air is.
  [
    { x: L.w * 0.24, y: heightToY(L, 2_500), size: L.rocketH * 0.5 },
    { x: L.w * 0.84, y: heightToY(L, 6_000), size: L.rocketH * 0.38 },
  ].forEach((c, i) => {
    const outline: Pt[] = [];
    [-0.9, -0.3, 0.3, 0.9].forEach((u, k) => {
      const r = c.size * (k === 1 || k === 2 ? 0.42 : 0.3);
      outline.push(...circle({ x: c.x + u * c.size * 0.55, y: c.y - r * 0.4 }, r, 20, Math.PI).slice(0, 11));
    });
    const shape = [...outline, { x: c.x + c.size * 0.95, y: c.y }, { x: c.x - c.size * 0.95, y: c.y }];
    fill(ctx, shape, pal.cloud, 0.95);
    sketch(ctx, shape, { seed: seed + 400 + i, color: pal.window, width: 1.2, jitter: 0.6, alpha: 0.55, closed: true });
  });

  // Landmarks, as dashed lines across the sky.
  landmarks.forEach((m, i) => {
    const y = heightToY(L, m.km * 1000);
    ctx.setLineDash([3, 7]);
    sketch(ctx, [{ x: L.rulerX + 70, y }, { x: L.w - 10, y }], { seed: seed + 500 + i, color: pal.mark, width: 1.3, jitter: 0.4, alpha: 0.7 });
    ctx.setLineDash([]);
    label(ctx, `${m.label} · ${group(m.km)} km`, L.w - 12, y - small * 0.8, pal, { size: small, color: pal.mark, align: 'right' });
  });

  // The ruler: every mark ten times higher than the one below it.
  sketch(ctx, [{ x: L.rulerX, y: L.groundY }, { x: L.rulerX, y: L.topY }], { seed: seed + 600, color: pal.charcoal, width: 1.3, jitter: 0.5 });
  [0, ...RULER_KM].forEach((km, i) => {
    const y = km === 0 ? L.groundY : heightToY(L, km * 1000);
    sketch(ctx, [{ x: L.rulerX - 4, y }, { x: L.rulerX + 8, y }], { seed: seed + 610 + i, color: pal.charcoal, width: 1.3, jitter: 0.3 });
    if (km) label(ctx, `${group(km)} km`, L.rulerX + 12, y, pal, { size: small, color: pal.charcoal });
  });

  // The Earth's outline and the coast under the pad, over the backdrop's colour.
  const surface = earthSurface(L);
  const land = coast(L);
  sketch(ctx, land, { seed: seed + 790, color: pal.charcoal, width: 1.4, jitter: 0.6, alpha: 0.8 });
  sketch(ctx, surface, { seed: seed + 800, color: pal.charcoal, width: 2.4, jitter: 0.8 });

  // The pad and its steel gantry.
  const H = L.rocketH;
  const padLeft = L.rocketX - H * 0.55;
  const padRight = L.rocketX + H * 0.55;
  const pad = [{ x: padLeft, y: L.groundY }, { x: padLeft, y: L.groundY - 5 }, { x: padRight, y: L.groundY - 5 }, { x: padRight, y: L.groundY }];
  fill(ctx, pad, pal.metal, 0.6);
  sketch(ctx, pad, { seed: seed + 900, color: pal.charcoal, width: 1.8, jitter: 0.5 });
  const gx = L.rocketX - H * 0.46;
  const gw = H * 0.1;
  const gTop = L.groundY - 5 - H * 1.12;
  sketch(ctx, [{ x: gx, y: L.groundY - 5 }, { x: gx, y: gTop }], { seed: seed + 910, color: pal.metal, width: 2, jitter: 0.5 });
  sketch(ctx, [{ x: gx - gw, y: L.groundY - 5 }, { x: gx - gw, y: gTop }], { seed: seed + 911, color: pal.metal, width: 2, jitter: 0.5 });
  const rungs = Math.max(4, Math.round((H * 1.12) / 12));
  for (let i = 0; i < rungs; i += 1) {
    const y0 = L.groundY - 5 - (H * 1.12 * i) / rungs;
    const y1 = L.groundY - 5 - (H * 1.12 * (i + 1)) / rungs;
    sketch(ctx, [{ x: gx - gw, y: y0 }, { x: gx, y: y1 }], { seed: seed + 920 + i, color: pal.metal, width: 1.1, jitter: 0.3 });
  }
}

/* ------------------------------------------------------------------ *
 * What moves: the rocket, its flame, the forces on it, smoke and dust
 * ------------------------------------------------------------------ */

export type Moment = {
  /** Where the nozzle is drawn, px. */
  baseY: number;
  /** Sideways shake, px. */
  shake: number;
  throttle: number;
  onPad: boolean;
  /** Newtons, for the arrows. */
  thrust: number;
  weight: number;
  /** Newtons of thrust the push arrow is drawn at full length for. */
  fullThrust: number;
  pushLabel: string;
  pullLabel: string;
  /** Seconds, for the flame's flicker and the smoke's drift; frozen under reduced motion. */
  t: number;
  seed: number;
  /** Seconds since the rocket fell back onto the pad, or null. */
  sinceLanding: number | null;
  /** The highest the last flight reached, metres, or null. */
  highest: number | null;
  highestLabel: string;
  /** The rocket is on its way, so draw the line it has flown. */
  trail: boolean;
};

export function drawMoment(ctx: CanvasRenderingContext2D, L: Layout, pal: Palette, m: Moment) {
  const H = L.rocketH;
  const x = L.rocketX + m.shake;
  const small = L.w < 520 ? 12 : 14;

  if (m.highest !== null && m.highest > 0) {
    const y = heightToY(L, m.highest);
    sketch(ctx, [{ x: L.rulerX - 4, y }, { x: L.rulerX + 16, y }], { seed: m.seed + 50, color: pal.red, width: 2.2, jitter: 0.3 });
    label(ctx, m.highestLabel, L.rulerX + 20, y - small * 0.8, pal, { size: small, color: pal.red });
  }

  if (m.trail) {
    ctx.setLineDash([2, 7]);
    sketch(ctx, [{ x: L.rocketX, y: L.groundY - 6 }, { x: L.rocketX, y: Math.max(-10, m.baseY + 4) }], {
      seed: m.seed + 60, color: pal.flame, width: 1.6, jitter: 0.3, alpha: 0.8,
    });
    ctx.setLineDash([]);
  }

  // Smoke rolls out across the pad while the engine fires near the ground.
  const low = L.groundY - m.baseY < H * 1.5;
  if (m.throttle > 0.05 && low) {
    for (let i = 0; i < 6; i += 1) {
      const side = i % 2 ? 1 : -1;
      const drift = ((m.t * 0.8 + i * 0.17) % 1) * H * 0.35;
      const d = (0.35 + Math.floor(i / 2) * 0.32) * H + drift;
      const r = H * (0.09 + 0.04 * Math.floor(i / 2)) * (0.5 + m.throttle);
      const puff = circle({ x: L.rocketX + side * d, y: L.groundY - 6 - r * 0.6 }, r, 16);
      fill(ctx, puff, pal.smoke, 0.95);
      sketch(ctx, puff, { seed: m.seed + 100 + i, color: pal.muted, width: 1.2, jitter: 0.8, closed: true });
    }
  }

  // The arm that holds the rocket upright, until it lifts.
  if (m.onPad && m.throttle < 0.35) {
    const gx = L.rocketX - H * 0.46;
    sketch(ctx, [{ x: gx, y: L.groundY - 5 - H * 0.62 }, { x: L.rocketX - H * 0.11, y: L.groundY - 5 - H * 0.62 }], {
      seed: m.seed + 150, color: pal.metal, width: 1.8, jitter: 0.4,
    });
  }

  // Dust, if it has just come back down — and a bounce as it settles.
  let bounce = 0;
  if (m.sinceLanding !== null && m.sinceLanding < 1) {
    const u = m.sinceLanding;
    bounce = -H * 0.14 * Math.exp(-u / 0.18) * Math.abs(Math.sin(u * 22));
    for (let k = 0; k < 4; k += 1) {
      const spread = H * (0.4 + u * 1.3) * (1 + k * 0.25);
      const arc = circle({ x: L.rocketX, y: L.groundY - 6 }, spread, 24, Math.PI).slice(0, 13);
      sketch(ctx, arc.map((p) => ({ x: p.x, y: L.groundY - 6 - (L.groundY - 6 - p.y) * 0.35 })), {
        seed: m.seed + 200 + k, color: pal.dust, width: 1.6, jitter: 1, alpha: 1 - u,
      });
    }
  }

  const base = m.baseY + bounce - (m.onPad ? 5 : 0);
  if (base < -H * 1.2) return;

  drawFlame(ctx, x, base, H, pal, m);
  drawRocket(ctx, x, base, H, pal, m.seed);
  drawForces(ctx, x, base, H, pal, m, small);
}

function arrow(ctx: CanvasRenderingContext2D, from: Pt, to: Pt, color: string, seed: number) {
  const len = Math.hypot(to.x - from.x, to.y - from.y);
  if (len < 4) return;
  const ux = (to.x - from.x) / len;
  const uy = (to.y - from.y) / len;
  const head = Math.min(10, len * 0.35);
  sketch(ctx, [from, to], { seed, color, width: 3, jitter: 0.4 });
  sketch(ctx, [{ x: to.x - ux * head - uy * head * 0.6, y: to.y - uy * head + ux * head * 0.6 }, to, { x: to.x - ux * head + uy * head * 0.6, y: to.y - uy * head - ux * head * 0.6 }], {
    seed: seed + 1, color, width: 3, jitter: 0.3,
  });
}

/**
 * The two forces on the rocket, to scale with each other, beside it on the
 * side away from the gantry: Earth's pull pointing down from the middle, the
 * engine's push pointing up from the nozzle. When the orange arrow is the
 * longer one, the rocket speeds up.
 */
function drawForces(ctx: CanvasRenderingContext2D, x: number, base: number, H: number, pal: Palette, m: Moment, small: number) {
  const perNewton = (H * 1.4) / m.fullThrust;
  const pull = m.weight * perNewton;
  const pullFrom = { x: x + H * 0.34, y: base - H * 0.55 };
  arrow(ctx, pullFrom, { x: pullFrom.x, y: pullFrom.y + pull }, pal.pull, m.seed + 700);
  label(ctx, m.pullLabel, pullFrom.x + 7, pullFrom.y + pull * 0.6, pal, { size: small, color: pal.pull });
  if (m.thrust > 0) {
    const push = m.thrust * perNewton;
    const pushFrom = { x: x + H * 0.6, y: base - H * 0.05 };
    arrow(ctx, pushFrom, { x: pushFrom.x, y: pushFrom.y - push }, pal.push, m.seed + 710);
    label(ctx, m.pushLabel, pushFrom.x + 7, pushFrom.y - push * 0.6, pal, { size: small, color: pal.push });
  }
}

function drawFlame(ctx: CanvasRenderingContext2D, x: number, base: number, H: number, pal: Palette, m: Moment) {
  if (m.throttle < 0.02) return;
  const flick = rng(Math.floor(m.t * 24) + 17);
  const len = H * (0.22 + 0.55 * m.throttle) * (1 + 0.1 * Math.sin(m.t * 37));
  const w = H * NOZZLE_HALF_WIDTH;
  const edge = (scale: number): Pt[] => {
    const pts: Pt[] = [{ x: x - w * scale, y: base }];
    for (let i = 1; i < 6; i += 1) {
      const u = i / 6;
      pts.push({ x: x - w * scale * (1 - u) * (1 + (flick() - 0.5) * 0.5), y: base + len * scale * u });
    }
    pts.push({ x, y: base + len * scale });
    for (let i = 5; i >= 1; i -= 1) {
      const u = i / 6;
      pts.push({ x: x + w * scale * (1 - u) * (1 + (flick() - 0.5) * 0.5), y: base + len * scale * u });
    }
    pts.push({ x: x + w * scale, y: base });
    return pts;
  };
  const outer = edge(1);
  fill(ctx, outer, pal.flame, 0.95);
  fill(ctx, edge(0.72), pal.flameMid, 0.95);
  fill(ctx, edge(0.42), pal.flameCore, 0.95);
  sketch(ctx, outer, { seed: m.seed + 300, color: pal.red, width: 1.2, jitter: 0.5, alpha: 0.8 });
}

function drawRocket(ctx: CanvasRenderingContext2D, x: number, base: number, H: number, pal: Palette, seed: number) {
  const r = rocketParts(x, base, H);
  colourIn(ctx, r.finLeft, pal.red, seed + 20, 3.5);
  colourIn(ctx, r.finRight, pal.red, seed + 30, 3.5);
  fill(ctx, r.hull, pal.body);
  colourIn(ctx, r.nose, pal.red, seed + 40, 3.5);
  colourIn(ctx, r.stripe, pal.red, seed + 50, 3);
  fill(ctx, r.nozzle, pal.metal, 0.9);
  const outline = { color: pal.charcoal, width: 1.8, jitter: 0.6 };
  sketch(ctx, r.finLeft, { ...outline, seed: seed + 1 });
  sketch(ctx, r.finRight, { ...outline, seed: seed + 2 });
  sketch(ctx, r.hull, { ...outline, seed: seed + 3, width: 2 });
  sketch(ctx, r.stripe, { ...outline, seed: seed + 4, width: 1.2 });
  sketch(ctx, r.nozzle, { ...outline, seed: seed + 5, width: 1.4 });
  const glass = circle(r.window.centre, r.window.radius, 18);
  colourIn(ctx, glass, pal.window, seed + 60, 2.5);
  sketch(ctx, glass, { ...outline, seed: seed + 6, width: 1.6 });
  const glint = circle({ x: r.window.centre.x - r.window.radius * 0.35, y: r.window.centre.y - r.window.radius * 0.35 }, r.window.radius * 0.22, 10);
  fill(ctx, glint, pal.body, 0.9);
}
