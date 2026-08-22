/**
 * TRAFFIC — the physics, and what a vehicle is.
 *
 * Where the cars actually go is `street.ts`, which places them along the route
 * so they work on an avenue, a cross street and a bridge deck alike. This file
 * is the model and the vehicle table, which both of those need and neither owns.
 *
 * ==================================================================
 * THE INTELLIGENT DRIVER MODEL
 * ==================================================================
 *
 * Cars are not tweened along a path. Each integrates the standard microscopic
 * car-following model (Treiber, Hennecke & Helbing, 2000):
 *
 *     dv/dt = a · [ 1 − (v/v₀)^δ − (s*(v, Δv) / s)² ]
 *     s*(v, Δv) = s₀ + max(0, v·T + v·Δv / (2√(a·b)))
 *
 * `s` is the bumper-to-bumper gap, `Δv` the closing speed. It is collision-free
 * by construction — as `s` approaches `s*` the braking term grows without bound
 * — so nothing keeps the cars apart by hand. They queue, close up and pull away
 * in a wave because that is what the equation does.
 *
 * `v₀` is 25 mph, New York City's default limit since 2014.
 *
 * A red light is injected as a stationary phantom car at the stop line, which
 * is the standard way to make IDM obey a signal: drivers brake for it on
 * exactly the profile they would use for a stopped vehicle.
 *
 * The avenue is a ring, so it never runs dry and the leader relation wraps.
 */

/** 25 mph in metres per second. */
export const V0 = 25 * 0.44704;

export const IDM = {
  /** Comfortable acceleration, m/s². */
  a: 1.3,
  /** Comfortable deceleration, m/s². Appears in the gap term, not applied. */
  b: 2.0,
  /** Acceleration exponent; 4 is the standard choice. */
  delta: 4,
  /** Gap kept when fully stopped, m. */
  s0: 2.0,
  /** Safe time headway, s. */
  T: 1.4,
} as const;

/** Returns acceleration in m/s². */
export function idmAcceleration(v: number, gap: number, closing: number, v0: number): number {
  const { a, b, delta, s0, T } = IDM;
  const sStar = s0 + Math.max(0, v * T + (v * closing) / (2 * Math.sqrt(a * b)));
  // Guarded only against a gap of exactly zero. The model is already
  // collision-free; clamping higher would hide a bug rather than prevent one.
  return a * (1 - Math.pow(v / v0, delta) - Math.pow(sStar / Math.max(gap, 0.05), 2));
}

export { VEHICLES, type VehicleKind } from './vehicles';
