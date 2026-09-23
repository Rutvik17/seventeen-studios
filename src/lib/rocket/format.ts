/**
 * How the rocket entry writes its numbers. Deterministic — the same on the
 * server that prerenders the page and in every browser — so the working can
 * be checked digit for digit.
 */

/** 1234567.8 → "1,234,568"; with `decimals`, "1,234,567.8". */
export function group(n: number, decimals = 0): string {
  const [whole, fraction] = Math.abs(n).toFixed(decimals).split('.');
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${n < 0 ? '−' : ''}${grouped}${fraction ? `.${fraction}` : ''}`;
}

export const kilonewtons = (newtons: number) => `${group(newtons / 1000, 1)} kN`;
export const kilograms = (kg: number) => `${group(kg)} kg`;
export const gravity = (g: number) => `${g.toFixed(2)} m/s²`;
export const metres = (m: number) => `${group(m)} m`;

/** Under a kilometre a second in m/s, above it in km/s. Always a size; the direction is said separately. */
export function speed(v: number): string {
  const s = Math.abs(v);
  return s < 1000 ? `${group(s)} m/s` : `${(s / 1000).toFixed(2)} km/s`;
}

/** A tenth of a kilometre near the ground, whole kilometres above ten. */
export function height(m: number): string {
  return m < 10_000 ? `${(m / 1000).toFixed(1)} km` : `${group(m / 1000)} km`;
}
