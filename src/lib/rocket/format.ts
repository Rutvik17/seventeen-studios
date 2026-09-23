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
export const newtons = (n: number) => `${group(n)} N`;

/** A size, in m/s²; the direction is said separately. */
export const acceleration = (a: number) => `${Math.abs(a).toFixed(2)} m/s²`;

/** Metres near the ground, kilometres from one up: "340 m", "2.5 km". */
export function altitude(m: number): string {
  return m < 1000 ? `${group(m)} m` : height(m);
}

/** A distance across the ground, whole kilometres. */
export const distance = (m: number) => `${group(m / 1000)} km`;

/** "92 minutes" up to two hours, "5 h 12 min" beyond. */
export function duration(seconds: number): string {
  const minutes = Math.round(seconds / 60);
  return minutes < 120 ? `${minutes} minutes` : `${Math.floor(minutes / 60)} h ${minutes % 60} min`;
}

/** To a tenth of a km/s: for top speeds compared across flights, which vary in the last digit with the frame rate. */
export const roughSpeed = (v: number) => `${(Math.abs(v) / 1000).toFixed(1)} km/s`;
