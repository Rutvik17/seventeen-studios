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

export const meganewtons = (newtons: number) => `${group(newtons / 1e6, 1)} MN`;
export const tonnes = (kg: number) => `${group(kg / 1000)} t`;
/** m/s², to two decimals — or three significant figures when it is small, far from the Earth. */
export const gravity = (g: number) => `${g >= 0.1 ? g.toFixed(2) : g.toPrecision(3)} m/s²`;

/** Under a kilometre a second in m/s, above it in km/s. Always a size; the direction is said separately. */
export function speed(v: number): string {
  const s = Math.abs(v);
  return s < 1000 ? `${group(s)} m/s` : `${(s / 1000).toFixed(2)} km/s`;
}

/** Metres near the ground, a tenth of a kilometre up to ten, whole kilometres above. */
export function height(m: number): string {
  if (m < 1000) return `${group(Math.max(0, m))} m`;
  return m < 10_000 ? `${(m / 1000).toFixed(1)} km` : `${group(m / 1000)} km`;
}

/** Whole kilometres, for distances across space. */
export const distance = (m: number) => `${group(m / 1000)} km`;

/** "00:08:27", or "2 d 23:35:08" once past a day: the mission clock. */
export function clock(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const d = Math.floor(s / 86_400);
  const pad = (n: number) => String(n).padStart(2, '0');
  const hms = `${pad(Math.floor((s % 86_400) / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;
  return d ? `${d} d ${hms}` : hms;
}

/** "2 hours", "3 days and 3 hours": how long, in words. */
export function span(seconds: number): string {
  const hours = Math.round(seconds / 3600);
  if (hours < 24) return `${hours} ${hours === 1 ? 'hour' : 'hours'}`;
  const d = Math.floor(hours / 24);
  const h = hours % 24;
  const days = `${d} ${d === 1 ? 'day' : 'days'}`;
  return h ? `${days} and ${h} ${h === 1 ? 'hour' : 'hours'}` : days;
}

/** "1 hour 58 minutes": a lap, in words. */
export function lap(seconds: number): string {
  const minutes = Math.round(seconds / 60);
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (!h) return `${m} minutes`;
  return `${h} ${h === 1 ? 'hour' : 'hours'}${m ? ` ${m} minutes` : ''}`;
}
