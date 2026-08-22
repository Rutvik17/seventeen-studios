/**
 * MASSING — the city beyond the distance where individual buildings mean
 * anything.
 *
 * ==================================================================
 * THE PROBLEM THIS SOLVES
 * ==================================================================
 *
 * From two and a half kilometres up, Manhattan is twenty-one kilometres long.
 * Drawing it lot by lot is on the order of a hundred thousand buildings, most of
 * them under a pixel. Not drawing it at all leaves the island bald — which is
 * exactly what the first aerial render looked like: a correct shoreline with
 * nothing on it, and Central Park floating in a blank field.
 *
 * So past the detailed radius the city stops being buildings and becomes
 * **mass**: one box per grid cell, its height taken from the district, drawn as
 * a silhouette. At that distance a city block is seven pixels across and a box
 * is an honest description of it.
 *
 * ==================================================================
 * THE GRID COARSENS WITH DISTANCE, AND IT HAS TO
 * ==================================================================
 *
 * A fixed cell size either costs too much near the camera or is too crude far
 * from it. The cell grows with distance so that a cell is roughly constant in
 * *pixels*, which is the only measure that matters: everything drawn ends up
 * about the same size on the page, and the work per frame stays flat however
 * high the camera goes.
 *
 * ==================================================================
 * THE LAND RASTER
 * ==================================================================
 *
 * Deciding whether a cell is land means testing it against a dozen shoreline
 * polygons. At a few thousand cells a frame that is a million point-in-polygon
 * tests, every frame, for an answer that never changes.
 *
 * So it is answered once. A 120 m raster over the whole city — about 26,000
 * cells — is built on first use and holds which borough, if any, each cell is
 * in. After that a lookup is two divisions and an array index. The shoreline is
 * static; there is no reason to keep asking.
 */

import {
  BOROUGH,
  DISTRICTS,
  JERSEY,
  MANHATTAN,
  ROOSEVELT,
  blockZ,
  downtownZ,
  inPark,
  inRing,
  type District,
} from './world';
import { hash2 } from './blocks';

/* ------------------------------------------------------------------ *
 * The land raster
 * ------------------------------------------------------------------ */

/** Raster resolution. Fine enough that a shoreline is not visibly stepped. */
const CELL = 120;

/** The widest a mass cell may get near the camera. About one avenue block. */
const MAX_CELL = 300;

/**
 * Beyond this, a cell is one box rather than a cluster.
 *
 * A cell out at ten kilometres is a few pixels across; the three boxes inside
 * it land on the same pixels and cost three times as much to say one thing.
 */
const CLUSTER_RANGE = 6000;

/**
 * A hard ceiling on how many volumes one call may return.
 *
 * Without it the far rings dominate — area grows with the square of the radius
 * — and a view out to thirty-four kilometres came back with thirteen thousand
 * boxes, three times what the frame can afford. Rings are walked nearest first,
 * so what survives the cap is what is closest.
 */
const MASS_BUDGET = 4200;

const BOUNDS = {
  minX: -8200,
  maxX: 6600,
  minZ: downtownZ(-13000),
  maxZ: blockZ(330),
};

const COLS = Math.ceil((BOUNDS.maxX - BOUNDS.minX) / CELL);
const ROWS = Math.ceil((BOUNDS.maxZ - BOUNDS.minZ) / CELL);

/** 0 is water. Otherwise an index into `LAND_KINDS`. */
let raster: Uint8Array | null = null;

const LAND_KINDS: { name: string; district: District }[] = [
  { name: 'water', district: 'midtown' },
  { name: 'manhattan', district: 'midtown' },
  { name: 'brooklyn', district: 'brooklyn' },
  { name: 'queens', district: 'queens' },
  { name: 'bronx', district: 'bronx' },
  { name: 'statenIsland', district: 'statenIsland' },
  { name: 'jersey', district: 'queens' },
  { name: 'roosevelt', district: 'brooklyn' },
];

function buildRaster(): Uint8Array {
  const out = new Uint8Array(COLS * ROWS);
  const tests: [number, [number, number][]][] = [
    [1, MANHATTAN],
    [2, BOROUGH.brooklyn.ring],
    [3, BOROUGH.queens.ring],
    [4, BOROUGH.bronx.ring],
    [5, BOROUGH.statenIsland.ring],
    [6, JERSEY],
    [7, ROOSEVELT],
  ];

  for (let r = 0; r < ROWS; r += 1) {
    const z = BOUNDS.minZ + (r + 0.5) * CELL;
    for (let c = 0; c < COLS; c += 1) {
      const x = BOUNDS.minX + (c + 0.5) * CELL;
      for (const [kind, ring] of tests) {
        if (inRing(ring, x, z)) {
          out[r * COLS + c] = kind;
          break;
        }
      }
    }
  }
  return out;
}

/** Which landmass covers this point, or 0 for water. */
export function landAt(x: number, z: number): number {
  if (!raster) raster = buildRaster();
  if (x < BOUNDS.minX || x >= BOUNDS.maxX || z < BOUNDS.minZ || z >= BOUNDS.maxZ) return 0;
  const c = Math.floor((x - BOUNDS.minX) / CELL);
  const r = Math.floor((z - BOUNDS.minZ) / CELL);
  return raster[r * COLS + c];
}

export function rasterCells(): number {
  if (!raster) raster = buildRaster();
  return raster.length;
}

/* ------------------------------------------------------------------ *
 * Volumes
 * ------------------------------------------------------------------ */

export type Mass = {
  x: number;
  z: number;
  width: number;
  depth: number;
  height: number;
  district: District;
  seed: number;
};

/**
 * Coarse volumes covering the camera's view, from `from` metres out to `to`.
 *
 * Walked in rings of increasing cell size so the count stays bounded: the area
 * of each ring grows with the square of its radius, and so does the cell, which
 * keeps the number of cells per ring roughly constant.
 */
export function massing(
  camX: number,
  camZ: number,
  from: number,
  to: number,
): Mass[] {
  const out: Mass[] = [];
  if (to <= from) return out;
  let cell = CELL;

  let radius = from;

  while (radius < to) {
    /*
      The cell is chosen for THIS ring before the ring's extent is worked out —
      the other way round sizes the ring with the previous ring's cell, and the
      two drift apart until the cells are wider than seventeen city blocks and
      the city reads as floor tiles.

      Capped at 300 m, which is about one avenue block. Past that a box stops
      describing a piece of city and starts describing a neighbourhood, and no
      amount of distance makes that look right.
    */
    // Cells go on widening past the cluster range, where nothing is legible
    // and the only thing that matters is how many there are.
    const ceiling = radius < CLUSTER_RANGE ? MAX_CELL : MAX_CELL * 3;
    cell = Math.min(ceiling, Math.max(CELL, Math.round(radius / 9 / CELL) * CELL || CELL));
    const next = Math.min(to, radius + cell * 14);

    const gx0 = Math.floor((camX - next) / cell);
    const gx1 = Math.ceil((camX + next) / cell);
    const gz0 = Math.floor((camZ - next) / cell);
    const gz1 = Math.ceil((camZ + next) / cell);

    for (let gz = gz0; gz <= gz1; gz += 1) {
      const z = (gz + 0.5) * cell;
      for (let gx = gx0; gx <= gx1; gx += 1) {
        const x = (gx + 0.5) * cell;
        const d = Math.hypot(x - camX, z - camZ);
        // Only this ring — the inner ones were done at a finer cell.
        if (d < radius || d >= next) continue;

        const kind = landAt(x, z);
        if (kind === 0) continue;
        if (kind === 1 && inPark(x, z)) continue;

        const district = kind === 1 ? manhattanDistrict(z, x) : LAND_KINDS[kind].district;
        const spec = DISTRICTS[district];
        const h = hash2(gx, gz, cell);
        const h2 = hash2(gx, gz, cell + 1);

        // A block's mass is its typical height, with the occasional tower
        // standing proud of it — which is what a skyline is.
        // Skew toward the low end, with a long tail — which is what a real
        // height distribution looks like. A uniform draw makes every block the
        // same middling height and the skyline turns into a plateau.
        const height =
          spec.low + Math.pow(h, 2.1) * (spec.high - spec.low) * 1.35 +
          (h2 < spec.towerChance ? spec.high * (0.6 + h2 * 9) : 0);

        /*
          A cell is a CLUSTER, not a box.

          One box per cell reads as a floor tile: a 300 m footprint 40 m tall is
          a slab, and a grid of slabs is a chessboard. Two to four smaller boxes
          at jittered offsets, at different heights, read as buildings — because
          the gaps between them are what the eye uses to count things.

          It costs three times the boxes and buys back more than that, since the
          cell can now be larger for the same apparent detail.
        */
        // Clusters only where they can be seen. Past a few kilometres a cell is
        // a handful of pixels and the three boxes inside it are one mark, so
        // the other two are pure cost — and there are thousands of cells out
        // there. Splitting by ring is what keeps the far view affordable.
        const count = radius < CLUSTER_RANGE ? 2 + Math.floor(hash2(gx, gz, cell + 5) * 3) : 1;

        for (let k = 0; k < count; k += 1) {
          const jx = hash2(gx * 31 + k, gz, cell + 11);
          const jz = hash2(gx, gz * 31 + k, cell + 12);
          const jh = hash2(gx + k, gz + k, cell + 13);

          const px = count === 1 ? x : x + (jx - 0.5) * cell * 0.62;
          const pz = count === 1 ? z : z + (jz - 0.5) * cell * 0.62;
          // The jitter can push a box off its own cell and into the river. The
          // cell being land is not the same claim as the box being on land.
          if (count > 1 && landAt(px, pz) !== kind) continue;

          out.push({
            x: px,
            z: pz,
            width: cell * (count === 1 ? 0.66 : 0.22 + jx * 0.2),
            depth: cell * (count === 1 ? 0.66 : 0.22 + jz * 0.2),
            // The tallest of a cluster carries the cell's height; the rest step
            // down, which is how a block actually masses.
            height: height * (k === 0 ? 1 : 0.42 + jh * 0.45),
            district,
            seed: Math.round((h + k * 0.137) * 1e6),
          });
        }
      }
    }
    radius = next;
    if (out.length >= MASS_BUDGET) break;
  }

  return out;
}

/** The district at a point on Manhattan, without the block machinery. */
function manhattanDistrict(z: number, x: number): District {
  if (z > blockZ(110)) return 'harlem';
  if (z > blockZ(53) && z < blockZ(60) && x > -830 && x < 300) return 'billionaires';
  if (z > blockZ(30)) return 'midtown';
  if (z > downtownZ(2600)) return 'village';
  return 'financial';
}
