/**
 * The globe's world and its marks, made once from a fixed seed so the globe
 * is the same drawing every time: the pencil lines (the coastlines and the
 * meridians) and the crayon patches (scribbles of colour over the whole
 * world, each in the colour of the ground under it).
 *
 * Nothing here touches the page, so `scripts/verify-globe.mjs` can check the
 * same world the page draws.
 */

import { rng } from '@/lib/sketchbook/geometry';
import { COLOUR_GRID, CRAYONS } from './colours';
import { LAND } from './land';

const DEG = Math.PI / 180;

/* ------------------------------------------------------------------ *
 * The world
 * ------------------------------------------------------------------ */

export type CrayonName = (typeof CRAYONS)[number];
export const crayonIndex = (name: CrayonName) => CRAYONS.indexOf(name);

/** The first three crayons are the sea's. */
export const isSea = (crayon: number) => crayon <= 2;

let grid: Uint8Array | null = null;

function cells(): Uint8Array {
  if (grid) return grid;
  const { cols, rows, runs } = COLOUR_GRID;
  const out = new Uint8Array(cols * rows);
  runs.forEach((line, row) => {
    let col = 0;
    for (const run of line.split('.')) {
      if (!run) continue;
      const n = parseInt(run.slice(1), 36);
      out.fill(run.charCodeAt(0) - 97, row * cols + col, row * cols + col + n);
      col += n;
    }
  });
  grid = out;
  return out;
}

/** The crayon for the ground (or sea) at (lon, lat). */
export function crayonAt(lon: number, lat: number): number {
  const { cols, rows } = COLOUR_GRID;
  const col = Math.floor((((((lon + 180) % 360) + 360) % 360) / 360) * cols);
  const row = Math.max(0, Math.min(rows - 1, Math.floor(((90 - lat) / 180) * rows)));
  return cells()[row * cols + Math.min(cols - 1, col)];
}

/** The nearest land crayon to (lon, lat) — for a coast or island finer than the colour grid. */
export function landCrayonNear(lon: number, lat: number): number {
  for (let ring = 0; ring <= 3; ring += 1) {
    for (let dy = -ring; dy <= ring; dy += 1) {
      for (let dx = -ring; dx <= ring; dx += 1) {
        const k = crayonAt(lon + dx * 0.5, lat + dy * 0.5);
        if (!isSea(k)) return k;
      }
    }
  }
  return crayonIndex('grass');
}

/** Whether (lon, lat) is inside one of the coastlines. */
export function isLand(lon: number, lat: number): boolean {
  return LAND.some((ring) => {
    let inside = false;
    for (let i = 0, j = ring.length / 2 - 1; i < ring.length / 2; j = i, i += 1) {
      const [xi, yi, xj, yj] = [ring[2 * i], ring[2 * i + 1], ring[2 * j], ring[2 * j + 1]];
      if (yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  });
}

/** A cut the map makes — along the 180° line, or through the South Pole — rather than a coast. */
export const isSeam = (lon0: number, lat0: number, lon1: number, lat1: number) =>
  (Math.abs(lon0) === 180 || lat0 === -90) && (Math.abs(lon1) === 180 || lat1 === -90);

/** Degrees of arc from one point to a nearby one. */
const arc = (lon0: number, lat0: number, lon1: number, lat1: number) => {
  let dl = lon1 - lon0;
  if (dl > 180) dl -= 360;
  if (dl < -180) dl += 360;
  return Math.hypot(dl * Math.cos(((lat0 + lat1) / 2) * DEG), lat1 - lat0);
};

/* ------------------------------------------------------------------ *
 * Pencil
 * ------------------------------------------------------------------ */

/** A pencil line on the globe: [lon, lat, lon, lat, …]. */
export type Line = Float32Array;

/** The coastlines, as runs broken wherever the map cuts a landmass, with points no more than a degree apart so they bend as the globe does. */
function coastLines(): Line[] {
  const out: Line[] = [];
  for (const ring of LAND) {
    const n = ring.length / 2;
    let run: number[] = [];
    const flush = () => {
      if (run.length >= 4) out.push(Float32Array.from(run));
      run = [];
    };
    for (let i = 0; i < n; i += 1) {
      const [lon0, lat0] = [ring[2 * i], ring[2 * i + 1]];
      const [lon1, lat1] = [ring[2 * ((i + 1) % n)], ring[2 * ((i + 1) % n) + 1]];
      if (isSeam(lon0, lat0, lon1, lat1)) {
        flush();
        continue;
      }
      if (!run.length) run.push(lon0, lat0);
      const steps = Math.max(1, Math.ceil(arc(lon0, lat0, lon1, lat1)));
      for (let k = 1; k <= steps; k += 1) run.push(lon0 + ((lon1 - lon0) * k) / steps, lat0 + ((lat1 - lat0) * k) / steps);
    }
    flush();
  }
  return out;
}

/** The meridians every 30°. */
function meridians(): Line[] {
  const out: Line[] = [];
  for (let lon = -180; lon < 180; lon += 30) {
    const pts: number[] = [];
    for (let lat = 80; lat >= -80; lat -= 2) pts.push(lon, lat);
    out.push(Float32Array.from(pts));
  }
  return out;
}

/* ------------------------------------------------------------------ *
 * Crayon
 * ------------------------------------------------------------------ */

export type Patch = {
  /** Where it is centred, and whether it colours the sea or the land. */
  lon: number;
  lat: number;
  sea: boolean;
  /** The scribble: one path, back and forth, [lon, lat, …]. */
  pts: Float32Array;
  /** The crayon each point's stretch of the path is drawn in. */
  crayon: Uint8Array;
  /** The direction the scribble's lines run, radians from east towards north. */
  angle: number;
  /** How wide the crayon's mark is, degrees of arc. */
  width: number;
};

/**
 * A crayon's neighbour in the box, for a line or two in each patch: the sea
 * shades between its blues, and the land between the colours either side of
 * it, so no patch is one flat colour.
 */
const COMPANION: Record<CrayonName, CrayonName> = {
  deep: 'sea',
  sea: 'deep',
  shallow: 'sea',
  forest: 'grass',
  grass: 'forest',
  savanna: 'desert',
  desert: 'savanna',
  rock: 'desert',
  tundra: 'grass',
  ice: 'ice',
};

/**
 * One scribble: `lines` strokes `long` degrees long and `gap` apart, back and
 * forth at `angle`, centred on (lon, lat), with the wobble of a hand.
 */
function scribble(lon: number, lat: number, angle: number, long: number, lines: number, gap: number, r: () => number): number[] {
  const local: [number, number][] = [];
  for (let j = 0; j < lines; j += 1) {
    const w = (j - (lines - 1) / 2) * gap + (r() - 0.5) * gap * 0.35;
    const reach = long / 2;
    const [a, b] = [-reach * (0.8 + r() * 0.35), reach * (0.8 + r() * 0.35)];
    const bow = (r() - 0.5) * gap * 0.5;
    const [from, to] = j % 2 ? [b, a] : [a, b];
    const steps = Math.max(2, Math.ceil(Math.abs(to - from)));
    for (let k = 0; k <= steps; k += 1) {
      const u = k / steps;
      local.push([from + (to - from) * u, w + bow * Math.sin(Math.PI * u)]);
    }
    // Round the turn to the next line.
    if (j < lines - 1) local.push([to + Math.sign(to - from) * gap * 0.35, w + gap * 0.5]);
  }
  const k = Math.max(0.05, Math.cos(lat * DEG));
  const pts: number[] = [];
  for (const [u, w] of local) {
    const east = u * Math.cos(angle) - w * Math.sin(angle);
    const north = u * Math.sin(angle) + w * Math.cos(angle);
    pts.push(lon + east / k, Math.max(-89.5, Math.min(89.5, lat + north)));
  }
  return pts;
}

function patch(lon: number, lat: number, sea: boolean, base: number, size: 'sea' | 'land' | 'island', r: () => number): Patch {
  const angle = (35 + (r() - 0.5) * 30) * DEG;
  const [long, lines, gap, width] =
    size === 'sea' ? [9 + r() * 2, 7 + Math.floor(r() * 2), 1.1, 1.45] : size === 'land' ? [6.5 + r() * 2, 6 + Math.floor(r() * 3), 0.95, 1.25] : [3, 4, 0.7, 1.0];
  const pts = scribble(lon, lat, angle, long, lines, gap, r);
  // Each line of the scribble takes the crayon of the ground under its middle —
  // unless that is the other side of a coast — and now and then its neighbour.
  const crayon = new Uint8Array(pts.length / 2);
  const perLine = Math.floor(crayon.length / lines);
  for (let j = 0; j < lines; j += 1) {
    const from = j * perLine;
    const to = j === lines - 1 ? crayon.length : from + perLine;
    const mid = Math.floor((from + to) / 2);
    let k = crayonAt(pts[2 * mid], pts[2 * mid + 1]);
    if (isSea(k) !== sea) k = base;
    if (r() < 0.22) k = crayonIndex(COMPANION[CRAYONS[k]]);
    crayon.fill(k, from, to);
  }
  return { lon, lat, sea, pts: Float32Array.from(pts), crayon, angle, width };
}

/** Patches over the whole world, spread evenly over the ball (a Fibonacci lattice), and one more on every small island. */
function patches(r: () => number): Patch[] {
  const out: Patch[] = [];
  const N = 1500;
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < N; i += 1) {
    const y = 1 - (2 * (i + 0.5)) / N;
    const lat = Math.asin(y) / DEG + (r() - 0.5) * 2;
    const lon = ((((golden * i) / DEG + (r() - 0.5) * 3) % 360) + 360) % 360 - 180;
    const k = crayonAt(lon, lat);
    out.push(patch(lon, lat, isSea(k), k, isSea(k) ? 'sea' : 'land', r));
  }
  for (const ring of LAND) {
    const lons = ring.filter((_, i) => i % 2 === 0);
    const lats = ring.filter((_, i) => i % 2 === 1);
    if ((Math.max(...lons) - Math.min(...lons)) * (Math.max(...lats) - Math.min(...lats)) > 60) continue;
    let lon = lons.reduce((a, b) => a + b, 0) / lons.length;
    let lat = lats.reduce((a, b) => a + b, 0) / lats.length;
    if (!isLand(lon, lat)) [lon, lat] = [lons[0], lats[0]];
    out.push(patch(lon, lat, false, landCrayonNear(lon, lat), 'island', r));
  }
  return out;
}

/* ------------------------------------------------------------------ *
 * All of it
 * ------------------------------------------------------------------ */

export type Marks = { coasts: Line[]; meridians: Line[]; patches: Patch[] };

let made: Marks | null = null;

/** The globe's marks — made once, the same every time. */
export function marks(): Marks {
  if (made) return made;
  const r = rng(20260923);
  made = { coasts: coastLines(), meridians: meridians(), patches: patches(r) };
  return made;
}
