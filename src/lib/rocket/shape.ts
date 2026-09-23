/**
 * The rockets' outlines, each written once in its own proportions and placed
 * on a page by a function here. The canvas draws them and the share card
 * draws them, so the two are the same rockets.
 *
 * Coordinates are fractions of the drawing's rocket height: `u` across from
 * the centre line, `v` up from the nozzle exit.
 */

import type { Pt } from '@/lib/sketchbook/geometry';

type UV = readonly [number, number];

function placer(cx: number, base: number, height: number, lift = 0) {
  return (points: readonly UV[], mirror = 1): Pt[] =>
    points.map(([u, v]) => ({ x: cx + mirror * u * height, y: base - (v - lift) * height }));
}

/** A box from `v0` to `v1`, `half` either side of the centre line. */
function box(half: number, v0: number, v1: number): UV[] {
  return [[-half, v0], [half, v0], [half, v1], [-half, v1]];
}

/* ------------------------------------------------------------------ *
 * Chapter one's rocket
 * ------------------------------------------------------------------ */

const HULL: UV[] = [
  [-0.11, 0.08], [-0.11, 0.72], [-0.1, 0.8], [-0.07, 0.88], [-0.035, 0.95], [0, 1],
  [0.035, 0.95], [0.07, 0.88], [0.1, 0.8], [0.11, 0.72], [0.11, 0.08], [-0.11, 0.08],
];
const NOSE: UV[] = [
  [-0.11, 0.72], [-0.1, 0.8], [-0.07, 0.88], [-0.035, 0.95], [0, 1], [0.035, 0.95], [0.07, 0.88], [0.1, 0.8], [0.11, 0.72], [-0.11, 0.72],
];
const FIN: UV[] = [[-0.11, 0.32], [-0.21, 0.12], [-0.21, 0], [-0.11, 0.08]];
const NOZZLE: UV[] = [[-0.06, 0.08], [-0.08, 0], [0.08, 0], [0.06, 0.08]];
const STRIPE: UV[] = [[-0.11, 0.36], [0.11, 0.36], [0.11, 0.42], [-0.11, 0.42], [-0.11, 0.36]];
const WINDOW = { v: 0.57, r: 0.05, inner: 0.032 };

/** Half the nozzle's width at its exit, as a fraction of height — where the flame starts. */
export const NOZZLE_HALF_WIDTH = 0.08;

export type RocketParts = {
  hull: Pt[];
  nose: Pt[];
  finLeft: Pt[];
  finRight: Pt[];
  nozzle: Pt[];
  stripe: Pt[];
  window: { centre: Pt; radius: number; inner: number };
};

/** The rocket with its nozzle exit centred at (`cx`, `base`), `height` tall. */
export function rocketParts(cx: number, base: number, height: number): RocketParts {
  const place = placer(cx, base, height);
  return {
    hull: place(HULL),
    nose: place(NOSE),
    finLeft: place(FIN),
    finRight: place(FIN, -1),
    nozzle: place(NOZZLE),
    stripe: place(STRIPE),
    window: { centre: { x: cx, y: base - WINDOW.v * height }, radius: WINDOW.r * height, inner: WINDOW.inner * height },
  };
}

/* ------------------------------------------------------------------ *
 * Chapter two's rocket: two stages, one on top of the other
 * ------------------------------------------------------------------ */

/** A pointed nose from `v0` up to `v1`, the same curve as chapter one's. */
const OGIVE = (half: number, v0: number, v1: number): UV[] =>
  (
    [[-1, 0], [-0.91, 0.29], [-0.64, 0.57], [-0.32, 0.82], [0, 1], [0.32, 0.82], [0.64, 0.57], [0.91, 0.29], [1, 0]] as const
  ).map(([u, v]) => [u * half, v0 + v * (v1 - v0)] as UV);

const LOWER = { half: 0.1, bottom: 0.08, top: 0.7 };
const BAND = { top: 0.76 };
const UPPER = { half: 0.085, top: 1.08, nose: 1.35 };

/** Where the upper stage's nozzle exit sits on the stack: where it flies from once alone. */
export const UPPER_BASE = LOWER.top;
/** Nozzle half-widths, as fractions of height, for the flames. */
export const STACK_NOZZLE = { lower: 0.075, upper: 0.055 } as const;

export type Tank = { outline: Pt[]; bottom: number; top: number; half: number; cx: number };

export type LowerStageParts = { hull: Pt[]; finLeft: Pt[]; finRight: Pt[]; nozzle: Pt[]; band: Pt[]; tank: Tank };
export type UpperStageParts = { hull: Pt[]; nose: Pt[]; nozzle: Pt[]; tank: Tank };

function tank(cx: number, base: number, height: number, half: number, v0: number, v1: number, lift = 0): Tank {
  const place = placer(cx, base, height, lift);
  return { outline: place(box(half, v0, v1)), bottom: base - (v0 - lift) * height, top: base - (v1 - lift) * height, half: half * height, cx };
}

/** The bottom stage, nozzle exit at (`cx`, `base`), with the band that joins it to the one above. */
export function lowerStageParts(cx: number, base: number, height: number): LowerStageParts {
  const place = placer(cx, base, height);
  return {
    hull: place(box(LOWER.half, LOWER.bottom, LOWER.top)),
    finLeft: place([[-0.1, 0.3], [-0.2, 0.1], [-0.2, 0], [-0.1, 0.08]]),
    finRight: place([[-0.1, 0.3], [-0.2, 0.1], [-0.2, 0], [-0.1, 0.08]], -1),
    nozzle: place([[-0.055, 0.08], [-0.075, 0], [0.075, 0], [0.055, 0.08]]),
    band: place(box(LOWER.half, LOWER.top, BAND.top)),
    tank: tank(cx, base, height, 0.05, 0.16, 0.62),
  };
}

/**
 * The top stage. `base` is where its own nozzle exit is: at `UPPER_BASE` up
 * the stack while it rides on the bottom stage, and at the bottom of the
 * drawing once it flies alone.
 */
export function upperStageParts(cx: number, base: number, height: number): UpperStageParts {
  const lift = UPPER_BASE;
  const place = placer(cx, base, height, lift);
  return {
    hull: place(box(UPPER.half, BAND.top, UPPER.top)),
    nose: place(OGIVE(UPPER.half, UPPER.top, UPPER.nose)),
    nozzle: place([[-0.04, BAND.top], [-0.055, UPPER_BASE], [0.055, UPPER_BASE], [0.04, BAND.top]]),
    tank: tank(cx, base, height, 0.04, 0.8, 1.03, lift),
  };
}

/** The stack's height, as a multiple of the rocket height. */
export const STACK_HEIGHT = UPPER.nose;

/* ------------------------------------------------------------------ *
 * Chapter four's booster, coming home
 * ------------------------------------------------------------------ */

const BOOST = { half: 0.06, bottom: 0.06, top: 1, band: 0.9 };

/** Half the booster's nozzle at its exit, as a fraction of height. */
export const BOOSTER_NOZZLE = 0.05;

export type BoosterParts = {
  hull: Pt[];
  band: Pt[];
  nozzle: Pt[];
  fins: Pt[][];
  /** Each leg as a line from its hinge to its foot, with the strut that braces it. */
  legs: { leg: Pt[]; strut: Pt[] }[];
  tank: Tank;
};

/**
 * The booster with its nozzle exit at (`cx`, `base`). `legs` runs from 0,
 * folded flat against the side, to 1, swung out and down to stand on.
 */
export function boosterParts(cx: number, base: number, height: number, legs: number): BoosterParts {
  const place = placer(cx, base, height);
  const k = Math.max(0, Math.min(1, legs));
  const at = ([u, v]: UV): Pt => ({ x: cx + u * height, y: base - v * height });
  const legsOut = [-1, 1].map((side) => {
    const hinge: UV = [side * BOOST.half, 0.32];
    // Folded: straight down the side. Out: to a foot beside the nozzle, below it.
    const foot: UV = [side * (BOOST.half + 0.17 * k), 0.02 - 0.05 * k];
    const mid: UV = [(hinge[0] + foot[0]) / 2, (hinge[1] + foot[1]) / 2];
    return { leg: [at(hinge), at(foot)], strut: [at([side * BOOST.half, 0.1]), at(mid)] };
  });
  return {
    hull: place(box(BOOST.half, BOOST.bottom, BOOST.top)),
    band: place(box(BOOST.half, BOOST.band, BOOST.top)),
    nozzle: place([[-0.035, BOOST.bottom], [-BOOSTER_NOZZLE, 0], [BOOSTER_NOZZLE, 0], [0.035, BOOST.bottom]]),
    fins: [-1, 1].map((side) => place(box(0.02, 0.84, 0.88).map(([u, v]) => [side * (BOOST.half + 0.022) + u, v] as UV))),
    legs: legsOut,
    tank: tank(cx, base, height, 0.028, 0.14, 0.84),
  };
}
