/**
 * The camera: which part of space is on the page, how big, and which way up.
 *
 * World coordinates are metres from the Earth's centre, y towards the top of
 * the Earth. Angles are measured clockwise from +y (the direction "up" at the
 * launch pad), the same convention the mission uses for a craft's nose.
 *
 * A camera puts the world point (x, y) at the fraction (ax, ay) of the page,
 * draws `scale` pixels to the metre, and turns the world so the direction at
 * angle `rot` points up the page — so "up from the ground" stays up the page
 * as the rocket flies round the curve of the Earth.
 */

import type { Pt } from '@/lib/sketchbook/geometry';

export type Camera = {
  x: number;
  y: number;
  /** Pixels per metre. */
  scale: number;
  /** The world direction that points up the page, radians clockwise from +y. */
  rot: number;
  /** Where (x, y) sits on the page, as fractions of its width and height. */
  ax: number;
  ay: number;
};

export type View = Camera & { w: number; h: number };

/** A world point on the page. */
export function toPage(v: View, x: number, y: number): Pt {
  const dx = x - v.x;
  const dy = y - v.y;
  const c = Math.cos(v.rot);
  const s = Math.sin(v.rot);
  // Turn the world anticlockwise by `rot`, so the direction at `rot` lands on +y.
  const rx = dx * c - dy * s;
  const ry = dx * s + dy * c;
  return { x: v.ax * v.w + rx * v.scale, y: v.ay * v.h - ry * v.scale };
}

/** How many metres of the world the page shows, corner to corner. */
export const reach = (v: View) => Math.hypot(v.w, v.h) / v.scale;

/** Clockwise angle of the direction (x, y) from +y. */
export const angleOf = (x: number, y: number) => Math.atan2(x, y);

function turn(a: number, b: number): number {
  let d = (b - a) % (2 * Math.PI);
  if (d > Math.PI) d -= 2 * Math.PI;
  if (d < -Math.PI) d += 2 * Math.PI;
  return d;
}

/**
 * Part-way from camera `a` to `b`: an even zoom (in the logarithm of scale),
 * the short way round, and the centre moving in step with the zoom.
 *
 * Moving the centre in a straight line while zooming a long way goes wrong:
 * halfway from the whole globe to a ship in orbit, a straight-line centre is
 * inside the Earth, and the page fills with sea. Instead the centre travels
 * as the page's own scale does — its share of the way is how far 1 ÷ scale
 * has come — so a zoom in heads for the target while still far out, and a
 * zoom out keeps the start in view until it is small.
 */
export function blend(a: Camera, b: Camera, u: number): Camera {
  if (u <= 0) return a;
  if (u >= 1) return b;
  const scale = Math.exp(Math.log(a.scale) + (Math.log(b.scale) - Math.log(a.scale)) * u);
  const far = Math.abs(Math.log(b.scale / a.scale)) > Math.log(2);
  const k = far ? (1 / a.scale - 1 / scale) / (1 / a.scale - 1 / b.scale) : u;
  return {
    x: a.x + (b.x - a.x) * k,
    y: a.y + (b.y - a.y) * k,
    scale,
    rot: a.rot + turn(a.rot, b.rot) * u,
    ax: a.ax + (b.ax - a.ax) * u,
    ay: a.ay + (b.ay - a.ay) * u,
  };
}

export const smoothstep = (u: number) => (u <= 0 ? 0 : u >= 1 ? 1 : u * u * (3 - 2 * u));

/** A camera that shows `metres` of the world across the page's shorter side, centred on (x, y) at (ax, ay). */
export function frameOn(x: number, y: number, metres: number, rot: number, short: number, ax = 0.5, ay = 0.5): Camera {
  return { x, y, scale: short / metres, rot, ax, ay };
}
