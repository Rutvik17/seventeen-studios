/**
 * The rocket entry's upright scene: a column of sky over the curve of the
 * Earth, a height ruler up the side, and a rocket on it — lifting off,
 * dropping a stage, or coming home onto a ship. Chapters one, two and four
 * are this scene with different settings (`SkyConfig`) and a different craft.
 *
 * Three layers, so a frame costs little: the backdrop (washes, drawn once per
 * size), the still drawing over it (re-drawn when the pencil boils, ten times
 * a second), and the moment (every frame).
 */

import { circle, rng, smooth, type Pt } from '@/lib/sketchbook/geometry';
import { arrow, colourIn, fill, hatch, label, sketch } from '@/lib/sketch/pencil';
import { group } from './format';
import type { Palette } from './palette';
import {
  BOOSTER_NOZZLE,
  NOZZLE_HALF_WIDTH,
  STACK_NOZZLE,
  UPPER_BASE,
  boosterParts,
  lowerStageParts,
  rocketParts,
  upperStageParts,
  type Tank,
} from './shape';

export type SkyConfig = {
  /**
   * How heights are drawn: `y ∝ ln(1 + h ÷ knee)`, up to `top` metres. Below
   * the knee it is close to even; above it, each step up the ruler is ten
   * times higher than the last — so lift-off and 10,000 km fit on one page,
   * and a landing's last few metres still have room.
   */
  scale: { knee: number; top: number };
  /** Heights marked on the ruler, metres. */
  ruler: readonly number[];
  landmarks: readonly { km: number; label: string }[];
  /** How high the two clouds float, metres. */
  clouds: readonly [number, number];
  /** What the rocket stands on: a launch pad on the coast, or a landing ship at sea. */
  ground: 'pad' | 'ship';
  /** How tall the craft is drawn, as a multiple of the scene's rocket height. */
  craftHeight: number;
};

export type Layout = {
  w: number;
  h: number;
  config: SkyConfig;
  /** The top of the Earth, where the pad stands. */
  groundY: number;
  topY: number;
  rocketX: number;
  rocketH: number;
  rulerX: number;
  earth: { cx: number; cy: number; r: number };
};

export function layoutFor(w: number, h: number, config: SkyConfig): Layout {
  const groundY = h - Math.max(44, h * 0.13);
  const rocketH = Math.max(52, Math.min(118, h * 0.17));
  const r = Math.max(w, h) * 1.6;
  return {
    w,
    h,
    config,
    groundY,
    topY: 16,
    rocketX: w * 0.56,
    rocketH,
    rulerX: 14,
    earth: { cx: w / 2, cy: groundY + r, r },
  };
}

/** Where the nozzle is drawn at `m` metres up. At the scale's `top`, the craft's nose has just left the drawing. */
export function heightToY(L: Layout, m: number): number {
  const { knee, top } = L.config.scale;
  const span = L.groundY - L.topY + L.rocketH * L.config.craftHeight * 1.05;
  return L.groundY - (span * Math.log1p(Math.max(0, m) / knee)) / Math.log1p(top / knee);
}

/** "10 m", "1 km", "10,000 km" — the ruler's marks. */
function rulerLabel(m: number): string {
  return m < 1000 ? `${group(m)} m` : `${group(m / 1000)} km`;
}

/* ------------------------------------------------------------------ *
 * What does not move: sky, ruler, Earth, pad or ship
 * ------------------------------------------------------------------ */

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

/** The landing ship's deck and hull, under the booster. */
function ship(L: Layout): { deck: Pt[]; hull: Pt[] } {
  const half = L.rocketH * 0.75;
  const x = L.rocketX;
  const y = L.groundY;
  return {
    deck: [{ x: x - half, y }, { x: x + half, y }, { x: x + half, y: y + 5 }, { x: x - half, y: y + 5 }],
    hull: [{ x: x - half, y: y + 5 }, { x: x + half, y: y + 5 }, { x: x + half * 0.94, y: y + 16 }, { x: x - half * 0.94, y: y + 16 }],
  };
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
  sky.addColorStop(1, spaceY > L.topY ? pal.space : pal.skyHigh);
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
  if (L.config.ground === 'pad') {
    const land = coast(L);
    const landShape = [...land, { x: L.rocketX + L.rocketH * 1.9, y: L.groundY - 20 }, { x: L.rocketX - L.rocketH * 1.6, y: L.groundY - 20 }];
    fill(ctx, landShape, pal.paper);
    colourIn(ctx, landShape, pal.land, seed + 760, 5, -Math.PI / 4);
  }
  ctx.restore();
}

export function drawStill(ctx: CanvasRenderingContext2D, L: Layout, pal: Palette, seed: number) {
  const small = L.w < 520 ? 12 : 14;
  const spaceY = heightToY(L, 100_000);
  const { config } = L;

  // Stars, above where space begins — if the drawing reaches that high.
  if (spaceY > L.topY) {
    const stars = rng(1729);
    const count = Math.round((L.w * (spaceY - L.topY)) / 2400);
    for (let i = 0; i < count; i += 1) {
      const x = 60 + stars() * (L.w - 70);
      const y = L.topY + stars() * (spaceY - L.topY - 10);
      const s = 1.6 + stars() * 2.6;
      sketch(ctx, [{ x: x - s, y }, { x: x + s, y }], { seed: seed + i * 3, color: pal.star, width: 1.4, jitter: 0.3 });
      sketch(ctx, [{ x, y: y - s }, { x, y: y + s }], { seed: seed + i * 3 + 1, color: pal.star, width: 1.4, jitter: 0.3 });
    }
  }

  // Two clouds, low down, where the air is.
  [
    { x: L.w * 0.24, y: heightToY(L, config.clouds[0]), size: L.rocketH * 0.5 },
    { x: L.w * 0.84, y: heightToY(L, config.clouds[1]), size: L.rocketH * 0.38 },
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
  config.landmarks.forEach((m, i) => {
    const y = heightToY(L, m.km * 1000);
    ctx.setLineDash([3, 7]);
    sketch(ctx, [{ x: L.rulerX + 70, y }, { x: L.w - 10, y }], { seed: seed + 500 + i, color: pal.mark, width: 1.3, jitter: 0.4, alpha: 0.7 });
    ctx.setLineDash([]);
    label(ctx, `${m.label} · ${group(m.km)} km`, L.w - 12, y - small * 0.8, pal, { size: small, color: pal.mark, align: 'right' });
  });

  // The ruler, with its marks.
  sketch(ctx, [{ x: L.rulerX, y: L.groundY }, { x: L.rulerX, y: L.topY }], { seed: seed + 600, color: pal.charcoal, width: 1.3, jitter: 0.5 });
  [0, ...config.ruler].forEach((m, i) => {
    const y = m === 0 ? L.groundY : heightToY(L, m);
    sketch(ctx, [{ x: L.rulerX - 4, y }, { x: L.rulerX + 8, y }], { seed: seed + 610 + i, color: pal.charcoal, width: 1.3, jitter: 0.3 });
    if (m) label(ctx, rulerLabel(m), L.rulerX + 12, y, pal, { size: small, color: pal.charcoal });
  });

  // The Earth's outline, over the backdrop's colour.
  sketch(ctx, earthSurface(L), { seed: seed + 800, color: pal.charcoal, width: 2.4, jitter: 0.8 });

  const H = L.rocketH;
  if (config.ground === 'ship') {
    // The landing ship: a flat steel deck with a target painted on it.
    const s = ship(L);
    fill(ctx, s.hull, pal.charcoal, 0.75);
    fill(ctx, s.deck, pal.metal, 0.9);
    sketch(ctx, s.hull, { seed: seed + 900, color: pal.charcoal, width: 1.6, jitter: 0.5, closed: true });
    sketch(ctx, s.deck, { seed: seed + 901, color: pal.charcoal, width: 1.6, jitter: 0.4, closed: true });
    const cross = H * 0.14;
    sketch(ctx, [{ x: L.rocketX - cross, y: L.groundY + 1 }, { x: L.rocketX + cross, y: L.groundY + 4 }], { seed: seed + 902, color: pal.body, width: 1.6, jitter: 0.3 });
    sketch(ctx, [{ x: L.rocketX + cross, y: L.groundY + 1 }, { x: L.rocketX - cross, y: L.groundY + 4 }], { seed: seed + 903, color: pal.body, width: 1.6, jitter: 0.3 });
    return;
  }

  // The coast under the pad, then the pad and its steel gantry.
  sketch(ctx, coast(L), { seed: seed + 790, color: pal.charcoal, width: 1.4, jitter: 0.6, alpha: 0.8 });
  const padLeft = L.rocketX - H * 0.55;
  const padRight = L.rocketX + H * 0.55;
  const pad = [{ x: padLeft, y: L.groundY }, { x: padLeft, y: L.groundY - 5 }, { x: padRight, y: L.groundY - 5 }, { x: padRight, y: L.groundY }];
  fill(ctx, pad, pal.metal, 0.6);
  sketch(ctx, pad, { seed: seed + 900, color: pal.charcoal, width: 1.8, jitter: 0.5 });
  const gx = L.rocketX - H * 0.46;
  const gw = H * 0.1;
  const gTop = L.groundY - 5 - H * 1.12 * config.craftHeight;
  sketch(ctx, [{ x: gx, y: L.groundY - 5 }, { x: gx, y: gTop }], { seed: seed + 910, color: pal.metal, width: 2, jitter: 0.5 });
  sketch(ctx, [{ x: gx - gw, y: L.groundY - 5 }, { x: gx - gw, y: gTop }], { seed: seed + 911, color: pal.metal, width: 2, jitter: 0.5 });
  const rungs = Math.max(4, Math.round((L.groundY - 5 - gTop) / 12));
  for (let i = 0; i < rungs; i += 1) {
    const y0 = L.groundY - 5 - ((L.groundY - 5 - gTop) * i) / rungs;
    const y1 = L.groundY - 5 - ((L.groundY - 5 - gTop) * (i + 1)) / rungs;
    sketch(ctx, [{ x: gx - gw, y: y0 }, { x: gx, y: y1 }], { seed: seed + 920 + i, color: pal.metal, width: 1.1, jitter: 0.3 });
  }
}

/* ------------------------------------------------------------------ *
 * What moves: the craft, its flame, the forces on it, smoke and dust
 * ------------------------------------------------------------------ */

/** Which craft to draw, and the state of the parts of it that change. */
export type CraftArt =
  | { kind: 'rocket' }
  /** Two stages; `stage` is the one firing, `fuel` each tank's fill from 0 to 1. */
  | { kind: 'stack'; stage: number; fuel: readonly [number, number] }
  /** The landing booster; `legs` from folded (0) to standing (1). */
  | { kind: 'booster'; legs: number; fuel: number };

export type Moment = {
  craft: CraftArt;
  /** Where the nozzle is drawn, px. */
  baseY: number;
  /** Sideways shake, px. */
  shake: number;
  /** How big the flame is, 0 to 1: the engine's power, or nothing once the tank is dry. */
  flame: number;
  onPad: boolean;
  /** Newtons, for the arrows. */
  thrust: number;
  weight: number;
  /** Newtons of thrust the push arrow is drawn at full length for. */
  fullThrust: number;
  thrustLabel: string;
  weightLabel: string;
  /** Seconds, for the flame's flicker and the smoke's drift; frozen under reduced motion. */
  t: number;
  seed: number;
  /** Seconds since it came down, or null. */
  sinceLanding: number | null;
  /** How fast it came down, m/s: a hard landing bounces and throws up dust, a soft one barely does. */
  landingSpeed: number;
  /** The highest the last flight reached, metres, or null. */
  highest: number | null;
  highestLabel: string;
  /** The rocket is on its way up, so draw the line it has flown. */
  trail: boolean;
  /** A stage that has dropped off: where it is, and how far it has tumbled, radians. */
  spent: { baseY: number; turn: number } | null;
};

/** How wide the flame starts, as a fraction of the rocket height. */
function nozzleOf(craft: CraftArt): number {
  if (craft.kind === 'stack') return craft.stage === 0 ? STACK_NOZZLE.lower : STACK_NOZZLE.upper;
  if (craft.kind === 'booster') return BOOSTER_NOZZLE;
  return NOZZLE_HALF_WIDTH;
}

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

  if (m.spent) drawSpent(ctx, L, pal, m.spent, m.seed);

  // Smoke — or spray, at sea — rolls out while the engine fires near the ground.
  const low = L.groundY - m.baseY < H * 1.5;
  if (m.flame > 0.05 && low) {
    for (let i = 0; i < 6; i += 1) {
      const side = i % 2 ? 1 : -1;
      const drift = ((m.t * 0.8 + i * 0.17) % 1) * H * 0.35;
      const d = (0.35 + Math.floor(i / 2) * 0.32) * H + drift;
      const r = H * (0.09 + 0.04 * Math.floor(i / 2)) * (0.5 + m.flame);
      const puff = circle({ x: L.rocketX + side * d, y: L.groundY - 6 - r * 0.6 }, r, 16);
      fill(ctx, puff, pal.smoke, 0.95);
      sketch(ctx, puff, { seed: m.seed + 100 + i, color: pal.muted, width: 1.2, jitter: 0.8, closed: true });
    }
  }

  // The arm that holds the rocket upright on the pad, until it lifts.
  if (L.config.ground === 'pad' && m.onPad && m.flame < 0.35) {
    const gx = L.rocketX - H * 0.46;
    const armY = L.groundY - 5 - H * 0.62 * L.config.craftHeight;
    sketch(ctx, [{ x: gx, y: armY }, { x: L.rocketX - H * 0.11, y: armY }], { seed: m.seed + 150, color: pal.metal, width: 1.8, jitter: 0.4 });
  }

  // Dust, if it has just come back down — and a bounce as it settles.
  let bounce = 0;
  if (m.sinceLanding !== null && m.sinceLanding < 1) {
    const u = m.sinceLanding;
    const hard = Math.min(1, m.landingSpeed / 40);
    bounce = -H * 0.14 * hard * Math.exp(-u / 0.18) * Math.abs(Math.sin(u * 22));
    // Dust thrown up off the pad; spray off a ship's deck.
    const dust = L.config.ground === 'ship' ? pal.window : pal.dust;
    for (let k = 0; k < 4; k += 1) {
      const spread = H * (0.4 + u * 1.3) * (1 + k * 0.25);
      const arc = circle({ x: L.rocketX, y: L.groundY - 6 }, spread, 24, Math.PI).slice(0, 13);
      sketch(ctx, arc.map((p) => ({ x: p.x, y: L.groundY - 6 - (L.groundY - 6 - p.y) * 0.35 })), {
        seed: m.seed + 200 + k, color: dust, width: 1.6, jitter: 1, alpha: (1 - u) * (0.25 + 0.75 * hard),
      });
    }
  }

  const base = m.baseY + bounce - (m.onPad && L.config.ground === 'pad' ? 5 : 0);
  if (base < -H * L.config.craftHeight * 1.2) return;

  drawFlame(ctx, x, base, H, nozzleOf(m.craft), pal, m);
  drawCraft(ctx, m.craft, x, base, H, pal, m.seed);
  drawForces(ctx, x, base, H, pal, m, small);
}

/**
 * The two forces on the rocket, to scale with each other, beside it on the
 * side away from the gantry: Earth's pull pointing down from the middle, the
 * engine's push pointing up from the nozzle. When the orange arrow is the
 * longer one, the rocket speeds up upwards.
 */
function drawForces(ctx: CanvasRenderingContext2D, x: number, base: number, H: number, pal: Palette, m: Moment, small: number) {
  const perNewton = (H * 1.4) / m.fullThrust;
  const pull = m.weight * perNewton;
  const pullFrom = { x: x + H * 0.34, y: base - H * 0.55 };
  arrow(ctx, pullFrom, { x: pullFrom.x, y: pullFrom.y + pull }, pal.pull, m.seed + 700);
  label(ctx, m.weightLabel, pullFrom.x + 7, pullFrom.y + pull * 0.6, pal, { size: small, color: pal.pull });
  if (m.thrust > 0) {
    const push = m.thrust * perNewton;
    const pushFrom = { x: x + H * 0.6, y: base - H * 0.05 };
    arrow(ctx, pushFrom, { x: pushFrom.x, y: pushFrom.y - push }, pal.push, m.seed + 710);
    label(ctx, m.thrustLabel, pushFrom.x + 7, pushFrom.y - push * 0.6, pal, { size: small, color: pal.push });
  }
}

function drawFlame(ctx: CanvasRenderingContext2D, x: number, base: number, H: number, nozzle: number, pal: Palette, m: Moment) {
  if (m.flame < 0.02) return;
  const flick = rng(Math.floor(m.t * 24) + 17);
  const len = H * (0.22 + 0.55 * m.flame) * (1 + 0.1 * Math.sin(m.t * 37));
  const w = H * nozzle;
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

/* ---- the craft ---- */

const outline = (pal: Palette) => ({ color: pal.charcoal, width: 1.8, jitter: 0.6 });

/** A tank's fuel, as a gauge showing through the hull: coloured in up to how full it is. */
function drawTank(ctx: CanvasRenderingContext2D, tank: Tank, full: number, pal: Palette, seed: number) {
  const level = Math.max(0, Math.min(1, full));
  const x0 = tank.cx - tank.half;
  const x1 = tank.cx + tank.half;
  if (level > 0.005) {
    const top = tank.bottom - (tank.bottom - tank.top) * level;
    colourIn(ctx, [{ x: x0, y: tank.bottom }, { x: x1, y: tank.bottom }, { x: x1, y: top }, { x: x0, y: top }], pal.flameMid, seed, 2.5, Math.PI / 4);
  }
  sketch(ctx, tank.outline, { seed: seed + 1, color: pal.charcoal, width: 1, jitter: 0.4, alpha: 0.6, closed: true });
}

function drawCraft(ctx: CanvasRenderingContext2D, craft: CraftArt, x: number, base: number, H: number, pal: Palette, seed: number) {
  if (craft.kind === 'rocket') return drawRocket(ctx, x, base, H, pal, seed);
  if (craft.kind === 'booster') return drawBooster(ctx, x, base, H, craft.legs, craft.fuel, pal, seed);
  if (craft.stage === 0) {
    drawLowerStage(ctx, x, base, H, craft.fuel[0], pal, seed);
    drawUpperStage(ctx, x, base - UPPER_BASE * H, H, craft.fuel[1], pal, seed + 500, false);
  } else {
    drawUpperStage(ctx, x, base, H, craft.fuel[1], pal, seed + 500, true);
  }
}

function drawRocket(ctx: CanvasRenderingContext2D, x: number, base: number, H: number, pal: Palette, seed: number) {
  const r = rocketParts(x, base, H);
  const o = outline(pal);
  colourIn(ctx, r.finLeft, pal.red, seed + 20, 3.5);
  colourIn(ctx, r.finRight, pal.red, seed + 30, 3.5);
  fill(ctx, r.hull, pal.body);
  colourIn(ctx, r.nose, pal.red, seed + 40, 3.5);
  colourIn(ctx, r.stripe, pal.red, seed + 50, 3);
  fill(ctx, r.nozzle, pal.metal, 0.9);
  sketch(ctx, r.finLeft, { ...o, seed: seed + 1 });
  sketch(ctx, r.finRight, { ...o, seed: seed + 2 });
  sketch(ctx, r.hull, { ...o, seed: seed + 3, width: 2 });
  sketch(ctx, r.stripe, { ...o, seed: seed + 4, width: 1.2 });
  sketch(ctx, r.nozzle, { ...o, seed: seed + 5, width: 1.4 });
  const glass = circle(r.window.centre, r.window.radius, 18);
  colourIn(ctx, glass, pal.window, seed + 60, 2.5);
  sketch(ctx, glass, { ...o, seed: seed + 6, width: 1.6 });
  const glint = circle({ x: r.window.centre.x - r.window.radius * 0.35, y: r.window.centre.y - r.window.radius * 0.35 }, r.window.radius * 0.22, 10);
  fill(ctx, glint, pal.body, 0.9);
}

function drawLowerStage(ctx: CanvasRenderingContext2D, x: number, base: number, H: number, fuel: number, pal: Palette, seed: number) {
  const p = lowerStageParts(x, base, H);
  const o = outline(pal);
  colourIn(ctx, p.finLeft, pal.red, seed + 20, 3.5);
  colourIn(ctx, p.finRight, pal.red, seed + 30, 3.5);
  fill(ctx, p.hull, pal.body);
  fill(ctx, p.nozzle, pal.metal, 0.9);
  drawTank(ctx, p.tank, fuel, pal, seed + 40);
  colourIn(ctx, p.band, pal.charcoal, seed + 45, 2.5);
  sketch(ctx, p.finLeft, { ...o, seed: seed + 1 });
  sketch(ctx, p.finRight, { ...o, seed: seed + 2 });
  sketch(ctx, p.hull, { ...o, seed: seed + 3, width: 2, closed: true });
  sketch(ctx, p.band, { ...o, seed: seed + 4, width: 1.4, closed: true });
  sketch(ctx, p.nozzle, { ...o, seed: seed + 5, width: 1.4 });
}

function drawUpperStage(ctx: CanvasRenderingContext2D, x: number, base: number, H: number, fuel: number, pal: Palette, seed: number, alone: boolean) {
  const p = upperStageParts(x, base, H);
  const o = outline(pal);
  if (alone) {
    fill(ctx, p.nozzle, pal.metal, 0.9);
    sketch(ctx, p.nozzle, { ...o, seed: seed + 5, width: 1.4 });
  }
  fill(ctx, p.hull, pal.body);
  drawTank(ctx, p.tank, fuel, pal, seed + 40);
  colourIn(ctx, p.nose, pal.red, seed + 50, 3.5);
  sketch(ctx, p.hull, { ...o, seed: seed + 3, width: 2, closed: true });
  sketch(ctx, p.nose, { ...o, seed: seed + 6 });
}

function drawBooster(ctx: CanvasRenderingContext2D, x: number, base: number, H: number, legs: number, fuel: number, pal: Palette, seed: number) {
  const p = boosterParts(x, base, H, legs);
  const o = outline(pal);
  p.legs.forEach((l, i) => {
    sketch(ctx, l.leg, { ...o, seed: seed + 70 + i, width: 2.6 });
    sketch(ctx, l.strut, { ...o, seed: seed + 80 + i, width: 1.4 });
  });
  fill(ctx, p.hull, pal.body);
  fill(ctx, p.nozzle, pal.metal, 0.9);
  drawTank(ctx, p.tank, fuel, pal, seed + 40);
  colourIn(ctx, p.band, pal.charcoal, seed + 45, 2.5);
  p.fins.forEach((f, i) => {
    fill(ctx, f, pal.metal, 0.8);
    sketch(ctx, f, { ...o, seed: seed + 90 + i, width: 1.2, closed: true });
  });
  sketch(ctx, p.hull, { ...o, seed: seed + 3, width: 2, closed: true });
  sketch(ctx, p.band, { ...o, seed: seed + 4, width: 1.2, closed: true });
  sketch(ctx, p.nozzle, { ...o, seed: seed + 5, width: 1.4 });
}

/** A dropped stage, tumbling as it falls: turned about its middle, empty. */
function drawSpent(ctx: CanvasRenderingContext2D, L: Layout, pal: Palette, spent: { baseY: number; turn: number }, seed: number) {
  const H = L.rocketH;
  const x = L.rocketX - H * 0.9;
  const mid = spent.baseY - H * 0.35;
  if (mid < -H || mid > L.h + H) return;
  ctx.save();
  ctx.translate(x, mid);
  ctx.rotate(spent.turn);
  ctx.translate(-x, -mid);
  drawLowerStage(ctx, x, spent.baseY, H, 0, pal, seed + 900);
  ctx.restore();
}
