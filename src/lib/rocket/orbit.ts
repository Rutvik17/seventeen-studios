/**
 * Newton's cannon: something thrown sideways from high above the Earth, with
 * nothing but gravity on it afterwards. The one part of the rocket entry that
 * needs two dimensions, on the same gravity as `physics.ts`.
 *
 * Coordinates are metres from Earth's centre, y up; the cannon stands on top
 * of the Earth and fires towards +x.
 *
 * ---
 *
 * WHERE IT GOES, WITHOUT FLYING IT
 *
 * A sideways throw is at one end of its orbit, so where the orbit goes is
 * settled by two numbers the moment it leaves the barrel:
 *
 * - Energy per kilogram, ε = v²/2 − GM/r. At zero or above, gravity can never
 *   bring it back: that is escape speed, v = √(2GM/r).
 * - Below that, the path is an ellipse, and the vis-viva equation gives its
 *   other end: r₂ = r ÷ (2GM/(r v²) − 1). If r₂ is inside the Earth, the
 *   ground gets in the way and it lands; otherwise it goes round for good,
 *   once every 2π √(a³/GM) seconds, a being half of r + r₂ (Kepler's third
 *   law). Exactly circular at v = √(GM/r). (Wikipedia, "Vis-viva equation",
 *   "Orbital period".)
 *
 * The drawing flies it step by step (`step`) and draws where it will go
 * (`path`); the words come from `outcomeOf`, which needs no steps at all.
 */

import { EARTH, GM, distanceFromCentre } from './physics';

export type Body = { x: number; y: number; vx: number; vy: number };

export type Outcome =
  | { kind: 'falls' }
  | { kind: 'orbits'; /** seconds */ period: number; /** metres above the ground */ low: number; high: number }
  | { kind: 'escapes' };

/** Thrown sideways at `speed` m/s from `height` metres above the top of the Earth. */
export function thrown(height: number, speed: number): Body {
  return { x: 0, y: distanceFromCentre(height), vx: speed, vy: 0 };
}

/** Where a sideways throw at `speed` from `height` ends up. */
export function outcomeOf(height: number, speed: number): Outcome {
  const r = distanceFromCentre(height);
  if (speed * speed / 2 - GM / r >= 0) return { kind: 'escapes' };
  if (speed <= 0) return { kind: 'falls' };
  const other = r / ((2 * GM) / (r * speed * speed) - 1);
  if (other <= EARTH.radius) return { kind: 'falls' };
  const a = (r + other) / 2;
  return {
    kind: 'orbits',
    period: 2 * Math.PI * Math.sqrt((a * a * a) / GM),
    low: Math.min(r, other) - EARTH.radius,
    high: Math.max(r, other) - EARTH.radius,
  };
}

function pull(x: number, y: number): [number, number] {
  const r2 = x * x + y * y;
  const k = -GM / (r2 * Math.sqrt(r2));
  return [k * x, k * y];
}

/** `dt` seconds on, by velocity Verlet: gravity only, energy kept to a few parts in a million an orbit. */
export function step(b: Body, dt: number): Body {
  const [ax, ay] = pull(b.x, b.y);
  const x = b.x + b.vx * dt + 0.5 * ax * dt * dt;
  const y = b.y + b.vy * dt + 0.5 * ay * dt * dt;
  const [bx, by] = pull(x, y);
  return { x, y, vx: b.vx + 0.5 * (ax + bx) * dt, vy: b.vy + 0.5 * (ay + by) * dt };
}

/** Height above the ground, metres. */
export function heightOf(b: Body): number {
  return Math.hypot(b.x, b.y) - EARTH.radius;
}

/** How far round the Earth it is from the cannon, radians, clockwise from the top. */
export function angleOf(b: Body): number {
  const a = Math.atan2(b.x, b.y);
  return a < 0 ? a + 2 * Math.PI : a;
}

/** Seconds of flight between points on a drawn path. */
export const PATH_STEP = 20;

/**
 * Where a throw will go, as points `PATH_STEP` seconds apart: until it lands,
 * gets `reach` metres from the centre, or has gone once round.
 */
export function path(height: number, speed: number, reach: number): { points: Body[]; lands: boolean } {
  let b = thrown(height, speed);
  const points = [b];
  let swept = 0;
  let last = angleOf(b);
  for (let i = 0; i < 4000; i += 1) {
    // Finer steps inside, where it moves fastest; the drawn points stay PATH_STEP apart.
    for (let k = 0; k < 10; k += 1) b = step(b, PATH_STEP / 10);
    points.push(b);
    if (heightOf(b) <= 0) return { points, lands: true };
    if (Math.hypot(b.x, b.y) > reach) break;
    const now = angleOf(b);
    swept += (now - last + 2 * Math.PI) % (2 * Math.PI);
    last = now;
    if (swept >= 2 * Math.PI) break;
  }
  return { points, lands: false };
}
