/**
 * The Earth's gravity: the part of the rocket entry's physics every other
 * part stands on. Pure functions of numbers — no canvas, no DOM — so the page,
 * the share card and the checks in `scripts` all run the same model.
 *
 * - Gravity weakens with height as the inverse square of the distance from
 *   Earth's centre: g(h) = g₀ × (R ÷ (R + h))². g₀ is standard gravity,
 *   9.80665 m/s², a defined value; R is the IUGG mean radius, 6,371,008.8 m.
 *   (Wikipedia, "Gravity of Earth".)
 * - Escape speed at distance r from the centre is √(2GM ÷ r). With GM = g₀R²
 *   that is √(2 × g(h) × r): gravity where you are, times how far you are from
 *   the centre. At the surface it comes to 11.18 km/s; the published figure is
 *   11.186 km/s — the small gap is because standard gravity already includes
 *   the effect of Earth's spin, which this model otherwise leaves out.
 *   (Wikipedia, "Escape velocity".)
 * - The speed that circles the Earth at r is √(GM ÷ r): escape speed ÷ √2.
 *
 * The trip itself — rockets, fuel, air, the Moon — is in `mission/`.
 */

/** Earth, as the model sees it. */
export const EARTH = {
  /** Standard gravity, m/s². A defined constant. */
  g0: 9.80665,
  /** Mean radius, metres (IUGG). */
  radius: 6_371_008.8,
} as const;

/** Earth's gravitational parameter, GM = g₀R², m³/s². */
export const GM = EARTH.g0 * EARTH.radius * EARTH.radius;

/** Gravity's strength at height `h` metres, m/s². */
export function gravityAt(h: number): number {
  const ratio = EARTH.radius / (EARTH.radius + h);
  return EARTH.g0 * ratio * ratio;
}

/** Distance from Earth's centre at height `h`, metres. */
export function distanceFromCentre(h: number): number {
  return EARTH.radius + h;
}

/** Escape speed at height `h`, m/s: √(2 × gravity here × distance from the centre). */
export function escapeSpeedAt(h: number): number {
  return Math.sqrt(2 * gravityAt(h) * distanceFromCentre(h));
}

/** The sideways speed that circles the Earth at height `h`, m/s: √(gravity here × distance from the centre). */
export function circleSpeedAt(h: number): number {
  return Math.sqrt(gravityAt(h) * distanceFromCentre(h));
}

