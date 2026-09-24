/**
 * How the globe sits on the page: where a point of the world lands for a
 * given turn of the globe, and which point of the world is under a given spot
 * of the page.
 *
 * The globe turns about its own axis and nothing else, and the page never
 * moves. The axis leans `TILT` to the right, the way a desk globe's does, and
 * the page looks at it from `LOOK` north of the equator, so the north is a
 * little more in view than the south.
 *
 * Screen coordinates here are fractions of the globe's radius: x to the right,
 * y up, and z towards the reader — z > 0 is the half of the globe facing out
 * of the page, and z is 1 at the middle of the face and 0 at the rim.
 */

const DEG = Math.PI / 180;

/** The axis's lean on the page, degrees clockwise from upright: the Earth's own tilt. */
export const TILT = 23.4;

/** How far north of the equator the page looks from, degrees. */
export const LOOK = 12;

/** Degrees the globe turns in a second, eastward: once round every 15 seconds. */
export const TURN = 24;

/** The longitude facing the reader when the page opens: Europe and Africa. */
export const FACING_AT_START = 20;

/** How far the globe has turned `t` seconds after the page opened, degrees (the longitude facing the reader is −spin). */
export const spinAt = (t: number) => -FACING_AT_START + TURN * t;

/** Frames a second the globe is drawn at, as a drawn animation is. */
export const FPS = 24;

const [cosT, sinT] = [Math.cos(TILT * DEG), Math.sin(TILT * DEG)];
const [cosE, sinE] = [Math.cos(LOOK * DEG), Math.sin(LOOK * DEG)];

export type Seen = { x: number; y: number; z: number };

/**
 * Where (lon, lat) is, with the globe turned `spin` degrees from its start.
 * Turning carries every point east: the longitude facing the reader is −spin.
 */
export function toScreen(lon: number, lat: number, spin: number): Seen {
  const l = (lon + spin) * DEG;
  const p = lat * DEG;
  const px = Math.cos(p) * Math.cos(l);
  const py = Math.cos(p) * Math.sin(l);
  const pz = Math.sin(p);
  const x = py;
  const y = -px * sinE + pz * cosE;
  return { x: x * cosT + y * sinT, y: -x * sinT + y * cosT, z: px * cosE + pz * sinE };
}

/**
 * The latitude, and the longitude before any turn, under screen point (x, y)
 * on the face: `toScreen` backwards. The longitude under it after a turn of
 * `spin` is `lon0 − spin`.
 */
export function fromScreen(x: number, y: number): { lon0: number; lat: number; z: number } | null {
  const u = x * cosT - y * sinT;
  const v = x * sinT + y * cosT;
  const zz = 1 - u * u - v * v;
  if (zz < 0) return null;
  const z = Math.sqrt(zz);
  const px = -v * sinE + z * cosE;
  const pz = v * cosE + z * sinE;
  return { lon0: Math.atan2(u, px) / DEG, lat: Math.asin(Math.max(-1, Math.min(1, pz))) / DEG, z };
}

/** The longitude facing the reader after a turn of `spin`. */
export const facing = (spin: number) => wrap180(-spin);

/** An angle in degrees, brought into [−180, 180). */
export const wrap180 = (a: number) => ((((a + 180) % 360) + 360) % 360) - 180;

/** An angle in degrees, brought into [0, 360). */
export const wrap360 = (a: number) => ((a % 360) + 360) % 360;

/**
 * The most a point can face the reader as the globe turns: z at its best,
 * when its longitude comes round to the middle. The far south never faces
 * the page squarely — the page looks from the north.
 */
export const bestFacing = (lat: number) => Math.cos((lat - LOOK) * DEG);

/** The sun's direction for the page's light: from the upper left, a little in front. */
export const LAMP = (() => {
  const v = [-0.5, 0.58, 0.64];
  const n = Math.hypot(v[0], v[1], v[2]);
  return { x: v[0] / n, y: v[1] / n, z: v[2] / n };
})();
