/**
 * The Earth, the Moon and the air, as the mission sees them: a flat slice
 * through space, the Earth at the origin, the Moon going round it.
 *
 * - Earth: standard gravity and the IUGG mean radius (`../physics.ts`), GM = g₀R².
 * - Moon: mean radius 1,737.4 km, surface gravity 1.622 m/s², mean distance
 *   384,399 km, once round every 27.321661 days (Wikipedia, "Moon"). Its GM
 *   comes from its size and gravity the same way Earth's does: GM = gR².
 * - Air: thins by a factor of e every 8.5 km up from 1.225 kg/m³ at sea
 *   level — the usual "scale height" approximation (Wikipedia, "Scale height";
 *   "Density of air"). Good to a few tens of kilometres, which is where it
 *   matters.
 *
 * Left out, and said on the page: Earth's spin, the Moon's, and the Earth
 * being pulled by the Moon in turn.
 */

import { EARTH, GM } from '../physics';

export { EARTH, GM };

export const MOON = {
  radius: 1_737_400,
  gravity: 1.622,
  /** Distance from Earth's centre, metres. */
  distance: 384_399_000,
  /** Seconds once round the Earth. */
  period: 27.321661 * 86_400,
} as const;

/** The Moon's GM, m³/s², from its surface gravity and radius. */
export const MOON_GM = MOON.gravity * MOON.radius * MOON.radius;

/**
 * Where the Moon is at mission time `t`. It goes round the same way the
 * rocket flies — clockwise on the page, as the Earth turns — starting at
 * `phase` radians clockwise from the top.
 */
export function moonAt(t: number, phase: number): { x: number; y: number; vx: number; vy: number } {
  const w = (2 * Math.PI) / MOON.period;
  const a = phase + w * t;
  const v = w * MOON.distance;
  return { x: MOON.distance * Math.sin(a), y: MOON.distance * Math.cos(a), vx: v * Math.cos(a), vy: -v * Math.sin(a) };
}

/** Gravity at (x, y): the Earth's pull, and the Moon's where one is given. */
export function gravity(x: number, y: number, moon: { x: number; y: number } | null): [number, number] {
  const r2 = x * x + y * y;
  const k = -GM / (r2 * Math.sqrt(r2));
  let ax = k * x;
  let ay = k * y;
  if (moon) {
    const dx = x - moon.x;
    const dy = y - moon.y;
    const d2 = dx * dx + dy * dy;
    const m = -MOON_GM / (d2 * Math.sqrt(d2));
    ax += m * dx;
    ay += m * dy;
  }
  return [ax, ay];
}

export const AIR = { seaLevel: 1.225, scaleHeight: 8_500 } as const;

/** Air density at height `h` metres above the Earth, kg/m³. */
export function airDensity(h: number): number {
  return h > 150_000 ? 0 : AIR.seaLevel * Math.exp(-Math.max(0, h) / AIR.scaleHeight);
}

/** Height above the Earth, metres. */
export const heightAt = (x: number, y: number) => Math.hypot(x, y) - EARTH.radius;
