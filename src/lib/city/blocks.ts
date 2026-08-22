/**
 * THE BLOCKS — everything in the city that is not a landmark.
 *
 * ==================================================================
 * THE CITY IS NOT BUILT, IT IS ANSWERED
 * ==================================================================
 *
 * Manhattan at lot resolution is on the order of a hundred thousand buildings.
 * Generating that up front costs seconds and hundreds of megabytes, and almost
 * all of it is never looked at — from a street corner you can see maybe four
 * hundred buildings, and most of those as a silhouette.
 *
 * So nothing is built in advance. `blockAt(bx, bz)` is a pure function of the
 * block's coordinates: ask it for a block and it derives that block's buildings
 * from a hash of its position, every time, identically. The renderer asks only
 * for the blocks near the camera. A cache keeps the ones recently asked for, and
 * throwing the cache away costs nothing but time, because the answer is not
 * stored anywhere — it is recomputed.
 *
 * That also means the server and the browser agree without shipping any data:
 * the city is about four kilobytes of rules, not a megabyte of coordinates.
 *
 * ==================================================================
 * LEVEL OF DETAIL, BY WAY OF SORTING
 * ==================================================================
 *
 * Each block comes back **sorted tallest first**. Distance then costs nothing to
 * implement: a block two hundred metres away draws all of its buildings, one two
 * kilometres away draws the first three.
 *
 * That ordering is what makes the switch invisible. The tallest buildings are
 * the ones that make the silhouette, so the ones dropped at distance are the
 * short ones hidden behind taller neighbours anyway. Sorting by height turns
 * level-of-detail from a thing that pops into a thing that fills in.
 *
 * ==================================================================
 * WHY THE MASSING LOOKS LIKE NEW YORK
 * ==================================================================
 *
 * Lots front onto the street, back onto each other, and share party walls. That
 * is the New York block: two rows of buildings back to back, with the depth of
 * the block split between them, and no gaps. A city generated as detached boxes
 * on a grid reads as a business park, and no amount of drawing style fixes it.
 *
 * The 1916 setback is here too, for anything tall enough to have needed it — a
 * tower had to step back as it rose so daylight could still reach the street,
 * and that single rule is why the pre-war skyline is a field of ziggurats and
 * the post-war one is a field of slabs.
 *
 * Water towers go on anything between six and twenty storeys, because that is
 * exactly the range where a building is too tall for street pressure and too
 * short to be worth a pump room. There are something like seventeen thousand of
 * them, and they are the most New York object there is.
 */

import {
  AVENUE,
  BLOCK,
  DISTRICTS,
  buildable,
  districtAt,
  type District,
} from './world';

export type BuildingShape =
  | 'box'        // a plain slab
  | 'setback'    // 1916 ziggurat
  | 'brownstone' // low, with a cornice
  | 'warehouse'  // low and wide, pitched or sawtooth roof
  | 'tower';     // tall, thin, modern

export type Building = {
  id: string;
  /** Footprint centre, world metres. */
  x: number;
  z: number;
  /** Along the street, and back from it. */
  width: number;
  depth: number;
  /** Roof height. */
  height: number;
  shape: BuildingShape;
  /** Steps, as [heightFraction, insetMetres], bottom to top. */
  setbacks: [number, number][];
  district: District;
  /** Stable per-building randomness for jitter, windows and tone. */
  seed: number;
  /** Wooden tank on the roof. */
  waterTower: boolean;
  /** Storeys, used for the window grid. */
  floors: number;
};

/** Storey height. Pre-war floors are taller than modern ones; this is the mean. */
export const STOREY = 3.6;

/* ------------------------------------------------------------------ *
 * Deterministic noise
 * ------------------------------------------------------------------ */

/**
 * A hash, not a generator.
 *
 * The distinction matters: a seeded PRNG gives the same *sequence*, so asking
 * for block A then block B differs from asking B then A. A hash gives the same
 * *value for the same input* regardless of order, which is what lets blocks be
 * generated on demand, out of order, and still agree with themselves.
 */
export function hash2(a: number, b: number, salt = 0): number {
  let h = Math.imul(a | 0, 0x27d4eb2d) ^ Math.imul(b | 0, 0x165667b1) ^ Math.imul(salt | 0, 0x9e3779b9);
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** A small local generator, seeded from a hash, for a run of values. */
export function stream(seed: number): () => number {
  let a = (seed * 4294967296) >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ------------------------------------------------------------------ *
 * The grid of blocks
 * ------------------------------------------------------------------ */

/**
 * Avenue edges, west to east, so a block index maps to a pair of them.
 *
 * Built from the avenue table rather than from an assumed spacing, which is why
 * the blocks between Madison, Park and Lexington come out short and the one
 * between Fifth and Sixth comes out long — the thing anyone who has walked
 * crosstown knows.
 */
const AVENUE_X = Object.values(AVENUE).slice().sort((a, b) => a - b);

/** Roadway width, kerb to kerb. Avenues are wider than streets. */
export const STREET_WIDTH = 18;
export const AVENUE_WIDTH = 30;

/** How many block columns there are. */
export const BLOCK_COLUMNS = AVENUE_X.length - 1;

/** The x range of a block column, inside the kerbs. */
export function columnBounds(bx: number): [number, number] | null {
  if (bx < 0 || bx >= BLOCK_COLUMNS) return null;
  return [AVENUE_X[bx] + AVENUE_WIDTH / 2, AVENUE_X[bx + 1] - AVENUE_WIDTH / 2];
}

/** The z range of a block row. Row n runs from street n to street n+1. */
export function rowBounds(bz: number): [number, number] {
  const south = (bz - 42) * BLOCK + STREET_WIDTH / 2;
  return [south, south + BLOCK - STREET_WIDTH];
}

/* ------------------------------------------------------------------ *
 * Generating one block
 * ------------------------------------------------------------------ */

const cache = new Map<string, Building[]>();
/** Bounded so a long flight over the city cannot grow without limit. */
const CACHE_LIMIT = 4000;

/**
 * The buildings on one block, tallest first.
 *
 * Pure in `(bx, bz)`. Cached only as an optimisation — clearing the cache
 * changes nothing about what is drawn.
 */
export function blockAt(bx: number, bz: number): Building[] {
  const key = `${bx}:${bz}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const built = build(bx, bz);
  if (cache.size >= CACHE_LIMIT) {
    // Oldest first — Map preserves insertion order, and the oldest entry is the
    // one the camera moved away from soonest.
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  cache.set(key, built);
  return built;
}

function build(bx: number, bz: number): Building[] {
  const column = columnBounds(bx);
  if (!column) return [];
  const [west, east] = column;
  const [south, north] = rowBounds(bz);

  const cx = (west + east) / 2;
  const cz = (south + north) / 2;
  if (!buildable(cx, cz)) return [];

  const district = districtAt(cx, cz);
  const spec = DISTRICTS[district];
  const rng = stream(hash2(bx, bz, 0x5f3a));

  const out: Building[] = [];
  const blockDepth = north - south;
  // Two rows of lots, back to back, sharing a party wall down the middle of the
  // block. That is the New York block, and it is why the streets are canyons.
  const lotDepth = blockDepth / 2;

  for (const side of [0, 1] as const) {
    const zNear = side === 0 ? south : north - lotDepth;
    let x = west;
    let i = 0;

    while (x < east - 6) {
      const [minF, maxF] = spec.frontage;
      const frontage = Math.min(minF + rng() * (maxF - minF), east - x);
      // Coverage leaves the odd gap — a yard, a parking lot, a demolition.
      if (rng() > spec.coverage) {
        x += frontage;
        i += 1;
        continue;
      }

      const seed = hash2(bx * 977 + i, bz * 31 + side, 0x1916);
      const tall = rng() < spec.towerChance;
      const height = tall
        ? spec.high + rng() * (spec.high * 1.4)
        : spec.low + rng() * (spec.high - spec.low);

      const floors = Math.max(1, Math.round(height / STOREY));
      const depth = lotDepth * (0.62 + rng() * 0.34);

      out.push({
        id: `${bx}:${bz}:${side}:${i}`,
        x: x + frontage / 2,
        z: side === 0 ? zNear + depth / 2 : zNear + lotDepth - depth / 2,
        width: frontage,
        depth,
        height,
        shape: shapeFor(district, height, rng),
        setbacks: setbacksFor(height, frontage, rng),
        district,
        seed,
        // Six to twenty storeys: too tall for street pressure, too short to be
        // worth a pump. Exactly the band that gets a tank on the roof.
        waterTower: floors >= 6 && floors <= 20 && rng() < 0.55,
        floors,
      });

      x += frontage;
      i += 1;
    }
  }

  // Tallest first, so distance can simply take fewer.
  out.sort((a, b) => b.height - a.height);
  return out;
}

function shapeFor(district: District, height: number, rng: () => number): BuildingShape {
  if (district === 'brooklyn' || district === 'queens' || district === 'statenIsland') {
    return rng() < 0.24 ? 'warehouse' : 'brownstone';
  }
  if (height < 30) return rng() < 0.7 ? 'brownstone' : 'box';
  if (height > 140) return rng() < 0.45 ? 'setback' : 'tower';
  return rng() < 0.35 ? 'setback' : 'box';
}

/**
 * The 1916 setbacks.
 *
 * Only for buildings tall enough to have hit the envelope. The rule scaled with
 * street width — a tower could rise straight up to a multiple of the street's
 * width, then had to step back within a sloping plane — so the steps get
 * shallower and more numerous the taller the building is, which is what gives
 * the wedding-cake profile its particular taper.
 */
function setbacksFor(height: number, frontage: number, rng: () => number): [number, number][] {
  if (height < 60) return [];
  const steps = height > 200 ? 3 : height > 120 ? 2 : 1;
  const out: [number, number][] = [];
  let at = 0.34 + rng() * 0.12;
  for (let i = 0; i < steps; i += 1) {
    out.push([at, Math.min(frontage * 0.16, 2.5 + rng() * 4)]);
    at += (1 - at) * (0.35 + rng() * 0.2);
  }
  return out;
}

/* ------------------------------------------------------------------ *
 * Asking for a neighbourhood
 * ------------------------------------------------------------------ */

/** Which block column contains an x. */
export function columnOf(x: number): number {
  for (let i = 0; i < BLOCK_COLUMNS; i += 1) {
    if (x >= AVENUE_X[i] && x < AVENUE_X[i + 1]) return i;
  }
  return x < AVENUE_X[0] ? -1 : BLOCK_COLUMNS;
}

/** Which block row contains a z. */
export function rowOf(z: number): number {
  return Math.floor(z / BLOCK) + 42;
}

/**
 * Every block whose centre is within `radius` of a point, nearest first.
 *
 * Nearest first matters: the renderer has a budget, and when it runs out the
 * blocks it has already drawn are the ones closest to the camera — the ones
 * that would have been most obviously missing.
 */
export function blocksNear(
  x: number,
  z: number,
  radius: number,
): { bx: number; bz: number; distance: number }[] {
  const out: { bx: number; bz: number; distance: number }[] = [];
  const rows = Math.ceil(radius / BLOCK);
  const centreRow = rowOf(z);

  for (let bx = 0; bx < BLOCK_COLUMNS; bx += 1) {
    const col = columnBounds(bx);
    if (!col) continue;
    const cx = (col[0] + col[1]) / 2;
    if (Math.abs(cx - x) > radius + 400) continue;

    for (let bz = centreRow - rows; bz <= centreRow + rows; bz += 1) {
      const [south, north] = rowBounds(bz);
      const cz = (south + north) / 2;
      const distance = Math.hypot(cx - x, cz - z);
      if (distance <= radius) out.push({ bx, bz, distance });
    }
  }

  out.sort((a, b) => a.distance - b.distance);
  return out;
}

/** Drop everything cached. Only useful when the generation rules change. */
export function clearBlockCache(): void {
  cache.clear();
}

export function blockCacheSize(): number {
  return cache.size;
}
