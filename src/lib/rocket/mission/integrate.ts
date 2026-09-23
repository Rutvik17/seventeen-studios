/**
 * One step of flight: gravity from the Earth (and the Moon, when given), the
 * engine's push along a direction, the air pushing back, and the propellant
 * the engine burns.
 *
 * Velocity Verlet — move with the acceleration here, then correct the speed
 * with the average of the acceleration here and where it arrived — so coasts
 * keep their energy to parts in a million an orbit. Drag depends on speed, so
 * it is evaluated at a predicted speed for the second half of the step.
 */

import { airDensity, gravity, heightAt } from './bodies';

export type Craft = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** kg, everything on board */
  m: number;
};

export type Push = {
  /** N */
  thrust: number;
  /** Unit vector the engine pushes along. */
  ux: number;
  uy: number;
  /** m/s: propellant burns at thrust ÷ exhaust */
  exhaust: number;
  /** Drag coefficient × frontal area, m². 0 above the air. */
  cda: number;
};

export const COAST: Push = { thrust: 0, ux: 0, uy: 0, exhaust: 1, cda: 0 };

function accel(c: Craft, vx: number, vy: number, push: Push, m: number, moon: { x: number; y: number } | null): [number, number] {
  const [gx, gy] = gravity(c.x, c.y, moon);
  let ax = gx + (push.thrust * push.ux) / m;
  let ay = gy + (push.thrust * push.uy) / m;
  if (push.cda > 0) {
    const rho = airDensity(heightAt(c.x, c.y));
    if (rho > 0) {
      const v = Math.hypot(vx, vy);
      const k = (0.5 * rho * v * push.cda) / m;
      ax -= k * vx;
      ay -= k * vy;
    }
  }
  return [ax, ay];
}

/** `dt` seconds on; the mass drops by the propellant burnt. */
export function step(c: Craft, dt: number, push: Push, moon: { x: number; y: number } | null = null): Craft {
  const burnt = push.thrust > 0 ? (push.thrust / push.exhaust) * dt : 0;
  const m1 = c.m - burnt;
  const [ax, ay] = accel(c, c.vx, c.vy, push, c.m, moon);
  const x = c.x + c.vx * dt + 0.5 * ax * dt * dt;
  const y = c.y + c.vy * dt + 0.5 * ay * dt * dt;
  const next = { x, y, vx: c.vx, vy: c.vy, m: m1 };
  const [bx, by] = accel(next, c.vx + ax * dt, c.vy + ay * dt, push, m1, moon);
  next.vx = c.vx + 0.5 * (ax + bx) * dt;
  next.vy = c.vy + 0.5 * (ay + by) * dt;
  return next;
}

/** Local "up" and "east" at a craft's position: unit vectors away from, and round, the Earth. */
export function frame(c: { x: number; y: number }): { ux: number; uy: number; ex: number; ey: number } {
  const r = Math.hypot(c.x, c.y);
  const ux = c.x / r;
  const uy = c.y / r;
  // East is clockwise round the Earth from the top: the way the rocket flies.
  return { ux, uy, ex: uy, ey: -ux };
}
