/**
 * THE EARTH, IN WATERCOLOUR — the drawing for "Earth we live on".
 *
 * The real world, not a guess at it: the coastlines are Natural Earth's
 * (`lib/globe/land.ts`) and every patch of colour is the land cover under it
 * (`paintAt`, from NASA's Blue Marble — forest, grass, savanna, desert, rock,
 * tundra, ice). They are projected onto a sphere seen from above the Atlantic
 * and painted the way the landing's film paints: a pencil outline of the
 * globe, the sea laid in as one wash that darkens toward the rim, each
 * landmass washed in the colour of its ground and then dabbed over with the
 * colour of each place on it, the coasts in pencil last, and a few white wisps
 * of cloud.
 *
 * It says what the entry says without a word: it is more water than land.
 */

import { LAND } from '@/lib/globe/land';
import { PAINTS } from '@/lib/globe/colours';
import { paintAt, isSea } from '@/lib/globe/marks';
import { between, rng } from '@/lib/film/random';
import { blob, Wash, type Pt } from '@/lib/film/wash';
import { pencil, type Stroke } from '@/lib/film/pencil';

const DEG = Math.PI / 180;

/** Watercolour for each of the colour grid's paints. */
const PIGMENT: Record<(typeof PAINTS)[number], string> = {
  deep: '#2f5f95',
  sea: '#4a7fb3',
  shallow: '#7fb0cf',
  forest: '#4f7f3f',
  grass: '#8fb055',
  savanna: '#c2ad62',
  desert: '#e0bf85',
  rock: '#a08c74',
  tundra: '#b3b394',
  ice: '#eef2f7',
};

export interface Drawing {
  ink: Stroke[];
  washes: Wash[];
}

/** Paint the Earth seen from (lon0, lat0), centred at (cx, cy) with radius R. */
export function earth(cx: number, cy: number, R: number, lon0 = -28, lat0 = 18, seed = 424): Drawing {
  const r = rng(seed);
  const ink: Stroke[] = [];
  const washes: Wash[] = [];
  const s0 = Math.sin(lat0 * DEG);
  const c0 = Math.cos(lat0 * DEG);

  /** Orthographic projection; points round the back are pushed out onto the rim. */
  const project = (lon: number, lat: number): { p: Pt; front: boolean } => {
    const l = (lon - lon0) * DEG;
    const f = lat * DEG;
    const x = Math.cos(f) * Math.sin(l);
    const y = c0 * Math.sin(f) - s0 * Math.cos(f) * Math.cos(l);
    const cosc = s0 * Math.sin(f) + c0 * Math.cos(f) * Math.cos(l);
    if (cosc >= 0) return { p: [cx + x * R, cy - y * R], front: true };
    const k = 1 / Math.max(1e-6, Math.hypot(x, y));
    return { p: [cx + x * k * R, cy - y * k * R], front: false };
  };
  const circle = (rad: number, n = 48): Pt[] => Array.from({ length: n }, (_, k) => [cx + Math.cos((k / n) * 2 * Math.PI) * rad, cy + Math.sin((k / n) * 2 * Math.PI) * rad] as Pt);

  // The globe, first as a pencil circle, gone round twice.
  ink.push(pencil([...circle(R, 72), circle(R, 72)[0]], r, { width: 1.2, tone: 0.85, overshoot: 4 }));
  ink.push(pencil([...circle(R + 1.5, 72), circle(R + 1.5, 72)[0]], r, { width: 0.7, tone: 0.35, overshoot: 8 }));

  // The sea: one wash, then the rim darkened, then light caught top-left.
  washes.push(new Wash(circle(R * 0.99), { color: PIGMENT.sea, layers: 16, alpha: 0.075, spread: 0.04, edge: 0.7, grain: 12 }, r));
  washes.push(new Wash([...circle(R * 0.99, 40), ...circle(R * 0.8, 40).reverse()], { color: PIGMENT.deep, layers: 10, alpha: 0.06, spread: 0.05, edge: 0.2 }, r));

  // The land: each landmass in the colour of most of its ground.
  const landWashes: Wash[] = [];
  for (const ring of LAND) {
    const pts: Pt[] = [];
    let seen = 0;
    const tally = new Map<number, number>();
    for (let i = 0; i < ring.length; i += 2) {
      const { p, front } = project(ring[i], ring[i + 1]);
      pts.push(p);
      if (front) seen++;
    }
    if (seen < 3) continue;
    for (let i = 0; i < ring.length; i += 6) {
      const k = paintAt(ring[i] + 0.3, ring[i + 1] + 0.3);
      if (!isSea(k)) tally.set(k, (tally.get(k) ?? 0) + 1);
    }
    const main = [...tally.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? PAINTS.indexOf('grass');
    landWashes.push(new Wash(pts, { color: PIGMENT[PAINTS[main]], layers: 12, alpha: 0.09, spread: 0.08, edge: 0.55, grain: 10 }, r));
    // The coast, in pencil, only where it faces us.
    let run: Pt[] = [];
    const flush = () => {
      if (run.length > 1) ink.push(pencil(run, r, { width: 0.7, tone: 0.55, wobble: 0.3, overshoot: 0 }));
      run = [];
    };
    for (let i = 0; i <= ring.length; i += 2) {
      const j = i % ring.length;
      const { p, front } = project(ring[j], ring[j + 1]);
      if (front) run.push(p);
      else flush();
    }
    flush();
  }
  washes.push(...landWashes);

  // Then the colour of each place: dabs across the land, in its own ground's colour.
  for (let lat = -80; lat <= 80; lat += 5) {
    for (let lon = -180; lon < 180; lon += 5 / Math.max(0.3, Math.cos(lat * DEG))) {
      const { p, front } = project(lon, lat);
      if (!front) continue;
      const k = paintAt(lon, lat);
      if (isSea(k)) continue;
      // Near the rim the dabs are foreshortened, like the land under them.
      const d = Math.hypot(p[0] - cx, p[1] - cy) / R;
      const size = R * 0.055 * Math.sqrt(Math.max(0.15, 1 - d * d));
      washes.push(new Wash(blob(p[0] + between(r, -2, 2), p[1] + between(r, -2, 2), size * 1.3, size, r, 7), { color: PIGMENT[PAINTS[k]], layers: 4, alpha: 0.11, spread: 0.35, edge: 0.25 }, r));
    }
  }

  // The graticule, faintly: every thirty degrees.
  for (let lon = -180; lon < 180; lon += 30) {
    let run: Pt[] = [];
    for (let lat = -88; lat <= 88; lat += 4) {
      const { p, front } = project(lon, lat);
      if (front) run.push(p);
      else if (run.length) {
        if (run.length > 1) ink.push(pencil(run, r, { width: 0.4, tone: 0.18, overshoot: 0 }));
        run = [];
      }
    }
    if (run.length > 1) ink.push(pencil(run, r, { width: 0.4, tone: 0.18, overshoot: 0 }));
  }
  for (let lat = -60; lat <= 60; lat += 30) {
    let run: Pt[] = [];
    for (let lon = -180; lon <= 180; lon += 4) {
      const { p, front } = project(lon, lat);
      if (front) run.push(p);
      else if (run.length) {
        if (run.length > 1) ink.push(pencil(run, r, { width: 0.4, tone: 0.18, overshoot: 0 }));
        run = [];
      }
    }
    if (run.length > 1) ink.push(pencil(run, r, { width: 0.4, tone: 0.18, overshoot: 0 }));
  }

  // Cloud: a few long white wisps, and the light on the sea top-left.
  for (let k = 0; k < 7; k++) {
    const a = between(r, 0, Math.PI * 2);
    const d = Math.sqrt(r()) * R * 0.7;
    const x = cx + Math.cos(a) * d;
    const y = cy + Math.sin(a) * d;
    washes.push(new Wash(blob(x, y, R * between(r, 0.12, 0.22), R * between(r, 0.03, 0.05), r, 9), { color: '#fbfcfe', layers: 5, alpha: 0.22, spread: 0.35, edge: 0.1 }, r));
  }
  washes.push(new Wash(blob(cx - R * 0.38, cy - R * 0.4, R * 0.28, R * 0.2, r), { color: '#dcebf5', layers: 6, alpha: 0.12, spread: 0.3, edge: 0 }, r));
  return { ink, washes };
}
