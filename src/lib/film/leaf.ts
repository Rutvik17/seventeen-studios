/**
 * THE MARK — a maple leaf in autumn.
 *
 * A sugar maple's leaf: five lobes, the three upper ones toothed, on a short
 * stalk. It is drawn and painted like everything else on the site — a pencil
 * outline and veins, then washes: cadmium yellow first, orange pulled into the
 * lobes' tips, a little red where the colour has turned furthest, and burnt
 * sienna at the base and in a few spots, the way a leaf browns.
 *
 * The outline is a list of points in a 100 × 100 box, stalk at the bottom.
 * `LEAF_OUTLINE` is exported so the tab icon can be drawn from the same shape.
 */

import { rng } from './random';
import { blob, Wash, type Pt } from './wash';
import { pencil, type Stroke } from './pencil';

/** The right half of the leaf, from the stalk up to the top tip; the left mirrors it. */
const RIGHT: Pt[] = [
  [51, 80],
  [57, 73],
  [68, 77],
  [65, 69],
  [80, 67],
  [74, 60],
  [89, 53],
  [84, 47],
  [95, 40],
  [83, 38],
  [85, 29],
  [75, 35],
  [69, 33],
  [71, 21],
  [63, 24],
  [59, 10],
  [55, 16],
  [50, 3],
];

export const LEAF_OUTLINE: Pt[] = [...RIGHT, ...RIGHT.slice(0, -1).reverse().map(([x, y]) => [100 - x, y] as Pt)];

export interface LeafDrawing {
  ink: Stroke[];
  washes: Wash[];
}

export function mapleLeaf(seed = 9): LeafDrawing {
  const r = rng(seed);
  const ink: Stroke[] = [];
  const washes: Wash[] = [];
  const paint = (pts: Pt[], color: string, alpha: number, layers = 10, spread = 0.1, edge = 0.5) => washes.push(new Wash(pts, { color, layers, alpha, spread, edge, grain: 6 }, r));
  const within = (k: number) => LEAF_OUTLINE.map(([x, y]) => [50 + (x - 50) * k, 45 + (y - 45) * k] as Pt);

  // The pencil: the outline, gone round once, and the stalk.
  ink.push(pencil([...LEAF_OUTLINE, LEAF_OUTLINE[0]], r, { width: 1.1, tone: 0.95, wobble: 0.25, overshoot: 1.5 }));
  ink.push(pencil([[50, 80], [49, 90], [46, 98]], r, { width: 1.1, tone: 0.8, overshoot: 0 }));
  // The veins: from the base out to the tip of each lobe.
  for (const tip of [[50, 6], [92, 41], [100 - 92, 41], [78, 66], [22, 66]] as Pt[]) {
    ink.push(pencil([[50, 76], [(50 + tip[0]) / 2 + (tip[0] > 50 ? -2 : tip[0] < 50 ? 2 : 0), (76 + tip[1]) / 2], tip], r, { width: 0.5, tone: 0.45, wobble: 0.3, overshoot: 0 }));
  }

  // The paint: yellow, then orange drawn out into the lobes, then red, then the browning.
  paint(within(0.98), '#eab23d', 0.16, 16, 0.06, 0.6);
  paint(within(0.55), '#f3c85a', 0.1, 8, 0.2, 0.2);
  paint(within(0.9), '#e4892b', 0.1, 12, 0.1, 0.55);
  for (const [x, y, rx, ry] of [[50, 18, 11, 12], [80, 45, 11, 8], [20, 45, 11, 8], [70, 68, 8, 5], [30, 68, 8, 5]] as const) {
    paint(blob(x, y, rx, ry, r, 8), '#d4602a', 0.1, 10, 0.3, 0.5);
  }
  paint(blob(58, 30, 9, 7, r, 8), '#b8392c', 0.1, 8, 0.3, 0.4);
  paint(blob(42, 50, 7, 6, r, 8), '#c9772e', 0.1, 8, 0.3, 0.4);
  paint(blob(50, 72, 9, 6, r, 8), '#8a4b2a', 0.12, 8, 0.25, 0.4);
  for (const [x, y] of [[66, 40], [33, 58], [55, 55]] as const) paint(blob(x, y, 2.2, 1.8, r, 6), '#7a3f22', 0.28, 4, 0.2, 0.2);
  paint([[50, 80], [49, 90], [46, 98], [48, 98], [51, 90], [52, 80]], '#8a4b2a', 0.25, 5, 0.05, 0.2);
  return { ink, washes };
}
