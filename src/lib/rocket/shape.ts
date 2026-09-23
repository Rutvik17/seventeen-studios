/**
 * The simple rocket outline the share card draws. The trip's own rockets are
 * in `scene/craft.ts`.
 *
 * Coordinates are fractions of the rocket's height: `u` across from the
 * centre line, `v` up from the nozzle exit.
 */

import type { Pt } from '@/lib/sketchbook/geometry';

type UV = readonly [number, number];

function placer(cx: number, base: number, height: number) {
  return (points: readonly UV[], mirror = 1): Pt[] => points.map(([u, v]) => ({ x: cx + mirror * u * height, y: base - v * height }));
}

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
