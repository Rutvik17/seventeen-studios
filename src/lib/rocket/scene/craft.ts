/**
 * The rockets, in coloured pencil: the booster, the ship, the tanker that
 * refuels it, and the two stacked for lift-off. Starship's proportions
 * (`mission/vehicle.ts`): a 71 m booster and a 50.3 m ship, both 9 m across.
 *
 * Each is written once in its own proportions — `u` across the centre line,
 * `v` up from the engines, both as fractions of the craft's length — and
 * drawn at any place, angle and size on the page.
 */

import { circle, type Pt } from '@/lib/sketchbook/geometry';
import { colourIn, fill, sketch } from '@/lib/sketch/pencil';
import { BOOSTER, SHIP } from '../mission/vehicle';
import type { Palette } from '../palette';

type UV = readonly [number, number];

const box = (half: number, v0: number, v1: number): UV[] => [
  [-half, v0],
  [half, v0],
  [half, v1],
  [-half, v1],
];

const OGIVE = (half: number, v0: number, v1: number): UV[] =>
  ([[-1, 0], [-0.97, 0.3], [-0.85, 0.55], [-0.6, 0.78], [-0.3, 0.94], [0, 1], [0.3, 0.94], [0.6, 0.78], [0.85, 0.55], [0.97, 0.3], [1, 0]] as const).map(
    ([u, v]) => [u * half, v0 + v * (v1 - v0)] as UV,
  );

const B_HALF = BOOSTER.diameter / 2 / BOOSTER.length;
const S_HALF = SHIP.diameter / 2 / SHIP.length;

/** How the stack's length divides between its stages. */
export const STACK_LENGTH = BOOSTER.length + SHIP.length;

export type CraftKind = 'stack' | 'booster' | 'ship' | 'tanker';

export const LENGTH: Record<CraftKind, number> = {
  stack: STACK_LENGTH,
  booster: BOOSTER.length,
  ship: SHIP.length,
  tanker: SHIP.length,
};

export type CraftLook = {
  /** Share of full power, 0–1: the flame. */
  throttle: number;
  /** How full each tank is, 0–1: the gauges. */
  fuel: number;
  /** The ship's tank, when drawn as part of the stack. */
  shipFuel?: number;
  /** Landing legs, folded (0) to standing (1). */
  legs?: number;
  seed: number;
  /** Seconds, for the flame's flicker. */
  t: number;
};

const outline = (pal: Palette) => ({ color: pal.charcoal, width: 1.6, jitter: 0.5 });

/** Draws in a frame where the craft stands on (0, 0), nose up, `k` pixels to a unit of its own length. */
function place(points: readonly UV[], k: number, lift = 0): Pt[] {
  return points.map(([u, v]) => ({ x: u * k, y: -(v + lift) * k }));
}

function gauge(ctx: CanvasRenderingContext2D, pal: Palette, half: number, v0: number, v1: number, full: number, k: number, lift: number, seed: number) {
  const level = Math.max(0, Math.min(1, full));
  if (level > 0.005) colourIn(ctx, place(box(half, v0, v0 + (v1 - v0) * level), k, lift), pal.flameMid, seed, 2.5, Math.PI / 4);
  sketch(ctx, place(box(half, v0, v1), k, lift), { seed: seed + 1, color: pal.charcoal, width: 0.9, jitter: 0.3, alpha: 0.55, closed: true });
}

function flame(ctx: CanvasRenderingContext2D, pal: Palette, half: number, k: number, lift: number, look: CraftLook) {
  if (look.throttle < 0.02) return;
  const flick = Math.sin(look.t * 37) * 0.08 + Math.sin(look.t * 23) * 0.05;
  const len = (0.25 + 0.45 * look.throttle) * (1 + flick);
  const shape = (s: number): Pt[] => {
    const pts: UV[] = [[-half * s, 0]];
    for (let i = 1; i < 6; i += 1) {
      const u = i / 6;
      pts.push([-half * s * (1 - u) * (1 + 0.25 * Math.sin(look.t * 31 + i)), -len * s * u]);
    }
    pts.push([0, -len * s]);
    for (let i = 5; i >= 1; i -= 1) {
      const u = i / 6;
      pts.push([half * s * (1 - u) * (1 + 0.25 * Math.sin(look.t * 29 + i * 2)), -len * s * u]);
    }
    pts.push([half * s, 0]);
    return place(pts, k, lift);
  };
  fill(ctx, shape(1), pal.flame, 0.95);
  fill(ctx, shape(0.72), pal.flameMid, 0.95);
  fill(ctx, shape(0.42), pal.flameCore, 0.95);
  sketch(ctx, shape(1), { seed: look.seed + 300, color: pal.red, width: 1.1, jitter: 0.5, alpha: 0.8, closed: true });
}

/** The booster, `k` px to its length, base at `lift` booster-lengths up. */
function booster(ctx: CanvasRenderingContext2D, pal: Palette, k: number, look: CraftLook, lift = 0) {
  const o = outline(pal);
  flame(ctx, pal, B_HALF * 0.9, k, lift, look);
  const hull = place(box(B_HALF, 0.02, 0.955), k, lift);
  fill(ctx, hull, pal.body);
  gauge(ctx, pal, B_HALF * 0.45, 0.1, 0.86, look.fuel, k, lift, look.seed + 10);
  // The hot-staging ring at the top, vented; a dark band round the engines.
  const ring = place(box(B_HALF, 0.955, 1), k, lift);
  colourIn(ctx, ring, pal.charcoal, look.seed + 20, 2.2);
  colourIn(ctx, place(box(B_HALF, 0, 0.035), k, lift), pal.metal, look.seed + 21, 2.2);
  // Grid fins near the top, sticking out either side.
  [-1, 1].forEach((side, i) => {
    const fin = place(box(0.02, 0.885, 0.93).map(([u, v]) => [side * (B_HALF + 0.022) + u, v] as UV), k, lift);
    fill(ctx, fin, pal.metal, 0.85);
    sketch(ctx, fin, { ...o, width: 1.1, seed: look.seed + 30 + i, closed: true });
  });
  sketch(ctx, hull, { ...o, seed: look.seed + 1, closed: true });
  sketch(ctx, ring, { ...o, width: 1.1, seed: look.seed + 2, closed: true });
}

/** The ship, `k` px to its length, base at `lift` ship-lengths up. */
function ship(ctx: CanvasRenderingContext2D, pal: Palette, k: number, look: CraftLook, lift = 0, tanker = false) {
  const o = outline(pal);
  flame(ctx, pal, S_HALF * 0.7, k, lift, look);
  const legs = look.legs ?? 0;
  if (legs > 0.02) {
    [-1, 1].forEach((side, i) => {
      const hinge: UV = [side * S_HALF, 0.2];
      const foot: UV = [side * (S_HALF + 0.14 * legs), -0.035 * legs];
      sketch(ctx, place([hinge, foot], k, lift), { ...o, width: 2.2, seed: look.seed + 40 + i });
      sketch(ctx, place([[side * S_HALF, 0.07], [(hinge[0] + foot[0]) / 2, (hinge[1] + foot[1]) / 2]], k, lift), { ...o, width: 1.2, seed: look.seed + 44 + i });
    });
  }
  const hull = place(box(S_HALF, 0.02, 0.74), k, lift);
  const nose = place(OGIVE(S_HALF, 0.74, 1), k, lift);
  const flaps = [-1, 1].flatMap((side) => [
    place([[side * S_HALF, 0.04], [side * (S_HALF + 0.07), 0.05], [side * (S_HALF + 0.07), 0.19], [side * S_HALF, 0.22]], k, lift),
    place([[side * S_HALF * 0.95, 0.76], [side * (S_HALF + 0.045), 0.78], [side * (S_HALF + 0.04), 0.86], [side * S_HALF * 0.75, 0.87]], k, lift),
  ]);
  fill(ctx, hull, tanker ? pal.metal : pal.body, tanker ? 0.55 : 1);
  if (!tanker) gauge(ctx, pal, S_HALF * 0.45, 0.08, 0.66, look.fuel, k, lift, look.seed + 50);
  flaps.forEach((f, i) => colourIn(ctx, f, tanker ? pal.metal : pal.red, look.seed + 60 + i, 3));
  colourIn(ctx, nose, tanker ? pal.metal : pal.red, look.seed + 70, 3);
  if (!tanker) {
    // A row of windows near the nose: people ride up here.
    [-0.45, 0, 0.45].forEach((u, i) => {
      const w = circle({ x: u * S_HALF * k, y: -(0.8 + lift) * k }, Math.max(1, S_HALF * 0.16 * k), 10);
      fill(ctx, w, pal.window, 0.9);
      sketch(ctx, w, { ...o, width: 0.8, seed: look.seed + 80 + i, closed: true });
    });
  }
  flaps.forEach((f, i) => sketch(ctx, f, { ...o, width: 1.1, seed: look.seed + 90 + i, closed: true }));
  sketch(ctx, hull, { ...o, seed: look.seed + 3, closed: true });
  sketch(ctx, nose, { ...o, seed: look.seed + 4 });
}

/**
 * A craft on the page: standing on `at`, its nose `angle` radians clockwise
 * from the top of the page, `px` pixels long.
 */
export function drawCraft(ctx: CanvasRenderingContext2D, pal: Palette, kind: CraftKind, at: Pt, angle: number, px: number, look: CraftLook) {
  ctx.save();
  ctx.translate(at.x, at.y);
  ctx.rotate(angle);
  if (kind === 'stack') {
    const kb = (px * BOOSTER.length) / STACK_LENGTH;
    booster(ctx, pal, kb, look);
    // The ship rides on top: its own length in the same pixels to the metre.
    ship(ctx, pal, (px * SHIP.length) / STACK_LENGTH, { ...look, throttle: 0, fuel: look.shipFuel ?? 1 }, BOOSTER.length / SHIP.length);
  } else if (kind === 'booster') {
    booster(ctx, pal, px, look);
  } else {
    ship(ctx, pal, px, look, 0, kind === 'tanker');
  }
  ctx.restore();
}
