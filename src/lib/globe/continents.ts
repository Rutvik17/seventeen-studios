/**
 * The seven continents, cut from the same coastlines as the globe, for
 * sketching one at a time beside it.
 *
 * Where continents join, the map's coastline runs straight on from one into
 * the next, so each is cut out with the line atlases use between them: Africa
 * from Asia down the Suez Canal and the Red Sea; Europe from Asia down the
 * Ural Mountains, the Ural River, the Caspian Sea, the crest of the Caucasus,
 * the Black Sea, the Bosphorus and the Dardanelles; North America from South
 * America at the Panama–Colombia border; and Oceania — Australia, New Guinea
 * and New Zealand — from the islands of Asia between New Guinea and its
 * neighbours. Each region below is a rough outline, in degrees of longitude
 * and latitude, that holds its continent's land and follows those lines where
 * it crosses land; Asia is the land in the east that no other holds.
 *
 * Each continent is drawn as it looks from straight above its middle, in an
 * equal-area view (Lambert's azimuthal), so its shape is true near the middle
 * and its size is true all over.
 *
 * Nothing here touches the page, so `scripts/verify-globe.mjs` checks the
 * same continents the page draws.
 */

import { LAND } from './land';
import { isSeam } from './marks';

const DEG = Math.PI / 180;

export const CONTINENT_IDS = ['africa', 'antarctica', 'asia', 'europe', 'north-america', 'oceania', 'south-america'] as const;
export type ContinentId = (typeof CONTINENT_IDS)[number];

type Region = readonly (readonly [number, number])[];

/** The regions that hold each continent but Asia, in the order they are asked. */
const REGIONS: [Exclude<ContinentId, 'asia'>, Region][] = [
  ['antarctica', [[-180, -60], [180, -60], [180, -90], [-180, -90]]],
  [
    'europe',
    [
      [-26, 36], [-26, 67.8], [-10, 72.5], [10, 85], [72, 85], [66.8, 68.6], [60, 60], [59.3, 52], [58, 51.2], [51.9, 47],
      [50, 44], [49.8, 40.6], [47.9, 41.2], [44.5, 42.7], [42.4, 43.35], [39, 44], [29.05, 41.25], [29.02, 41], [27.5, 40.6], [26.6, 40.3], [26.2, 40], [26.5, 34.5],
      [15.5, 35.5], [11.8, 37.9], [8, 38.2], [-2, 36.2], [-5.6, 35.97], [-10, 36],
    ],
  ],
  [
    'africa',
    [
      [-26, 36], [-10, 36], [-5.6, 35.97], [-2, 36.2], [8, 38.2], [11.8, 37.9], [15.5, 35.5], [26.5, 34.5], [32.3, 31.35],
      [32.55, 29.95], [43.4, 12.6], [60, 12], [60, -45], [-26, -45],
    ],
  ],
  ['oceania', [[108, -10.5], [128, -10.5], [131.2, -5], [131.2, -3], [130.6, -0.8], [131, 0.8], [155, 0.8], [180, -12], [180, -55], [108, -55]]],
  ['south-america', [[-92, 5], [-77.9, 7.2], [-77.35, 8.68], [-75, 13], [-60, 13], [-30, 5], [-30, -60], [-92, -60]]],
  [
    'north-america',
    [
      [-168.5, 85], [-10, 85], [-10, 72.5], [-26, 67.8], [-26, 60], [-40, 20], [-60, 13], [-75, 13], [-77.35, 8.68], [-77.9, 7.2],
      [-92, 5], [-120, 5], [-168.5, 52],
    ],
  ],
];

/** Asia: the land from 25° E round to 168.5° W (the Bering Strait), north of 11° S, that no other region holds. */
const ASIA: Region = [[25, -11], [191.5, -11], [191.5, 85], [25, 85]];

/** Where each continent is seen from: the middle of its sketch. */
export const CENTRES: Record<ContinentId, readonly [number, number]> = {
  africa: [18, 2],
  antarctica: [0, -90],
  asia: [98, 44],
  europe: [18, 55],
  'north-america': [-88, 50],
  oceania: [150, -24],
  'south-america': [-60, -20],
};

function inside(region: Region, lon: number, lat: number): boolean {
  let hit = false;
  for (let i = 0, j = region.length - 1; i < region.length; j = i, i += 1) {
    const [xi, yi] = region[i];
    const [xj, yj] = region[j];
    if (yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) hit = !hit;
  }
  return hit;
}

/** The continent (lon, lat) is on — asked of land; the sea belongs to none. */
export function continentOf(lon: number, lat: number): ContinentId | null {
  for (const [id, region] of REGIONS) if (inside(region, lon, lat)) return id;
  const east = lon < -168.5 ? lon + 360 : lon;
  return inside(ASIA, east, lat) ? 'asia' : null;
}

/**
 * The region a continent's colour is kept inside, as outlines to clip with:
 * one to keep inside, and — for Asia — the others' to keep out of.
 */
export function regionOf(id: ContinentId): { keep: Region; without: Region[] } {
  if (id !== 'asia') return { keep: REGIONS.find(([k]) => k === id)![1], without: [] };
  return { keep: ASIA, without: REGIONS.filter(([k]) => k === 'europe' || k === 'africa' || k === 'oceania').map(([, r]) => r) };
}

/**
 * Every region's outline that meets another continent — the lines between
 * continents are the parts of these that cross land. (Antarctica's is left
 * out: it meets none, and its edge runs down the 180° line to the pole.)
 */
export const borders = (): Region[] => REGIONS.filter(([id]) => id !== 'antarctica').map(([, r]) => r);

/**
 * A continent's coastline, as runs of [lon, lat, …] a degree apart at most,
 * longest first. Each run reaches one point past where its continent ends, so
 * a line clipped to the region meets the border exactly.
 */
export function coastOf(id: ContinentId): number[][] {
  const runs: number[][] = [];
  for (const ring of LAND) {
    const n = ring.length / 2;
    // The ring a degree at a time, broken where the map cuts it.
    const pts: [number, number][] = [];
    const breaks = new Set<number>();
    for (let i = 0; i < n; i += 1) {
      const [lon0, lat0] = [ring[2 * i], ring[2 * i + 1]];
      const [lon1, lat1] = [ring[2 * ((i + 1) % n)], ring[2 * ((i + 1) % n) + 1]];
      if (isSeam(lon0, lat0, lon1, lat1)) {
        pts.push([lon0, lat0]);
        breaks.add(pts.length - 1);
        continue;
      }
      const steps = Math.max(1, Math.ceil(Math.hypot((lon1 - lon0) * Math.cos(((lat0 + lat1) / 2) * DEG), lat1 - lat0)));
      for (let k = 0; k < steps; k += 1) pts.push([lon0 + ((lon1 - lon0) * k) / steps, lat0 + ((lat1 - lat0) * k) / steps]);
    }
    const ours = pts.map(([lon, lat]) => continentOf(lon, lat) === id);
    if (!ours.some(Boolean)) continue;
    // Start where the coast is not ours (or anywhere, if it all is), and gather what is.
    const start = ours.every(Boolean) ? 0 : ours.findIndex((o) => !o);
    let run: number[] = [];
    const flush = () => {
      if (run.length >= 4) runs.push(run);
      run = [];
    };
    for (let s = 0; s <= pts.length; s += 1) {
      const i = (start + s) % pts.length;
      const prev = (i - 1 + pts.length) % pts.length;
      if (breaks.has(prev)) flush();
      if (ours[i]) {
        if (!run.length && !ours[prev] && !breaks.has(prev)) run.push(...pts[prev]);
        run.push(...pts[i]);
      } else if (run.length) {
        run.push(...pts[i]);
        flush();
      }
    }
    flush();
  }
  return runs.sort((a, b) => b.length - a.length);
}

/**
 * Lambert's equal-area view from above (lon0, lat0): a point's place, in Earth
 * radii — x east, y north — and back again.
 */
export function equalArea(lon0: number, lat0: number) {
  const [s0, c0] = [Math.sin(lat0 * DEG), Math.cos(lat0 * DEG)];
  return {
    to(lon: number, lat: number): { x: number; y: number } {
      const [s, c] = [Math.sin(lat * DEG), Math.cos(lat * DEG)];
      const dl = (lon - lon0) * DEG;
      const k = Math.sqrt(2 / Math.max(1e-9, 1 + s0 * s + c0 * c * Math.cos(dl)));
      return { x: k * c * Math.sin(dl), y: k * (c0 * s - s0 * c * Math.cos(dl)) };
    },
    from(x: number, y: number): { lon: number; lat: number } {
      const rho = Math.hypot(x, y);
      if (rho < 1e-12) return { lon: lon0, lat: lat0 };
      const cc = 2 * Math.asin(Math.min(1, rho / 2));
      const lat = Math.asin(Math.cos(cc) * s0 + (y * Math.sin(cc) * c0) / rho) / DEG;
      const lon = lon0 + Math.atan2(x * Math.sin(cc), rho * c0 * Math.cos(cc) - y * s0 * Math.sin(cc)) / DEG;
      return { lon: ((((lon + 180) % 360) + 360) % 360) - 180, lat };
    },
  };
}
