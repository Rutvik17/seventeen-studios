/**
 * THE SUBJECT: NVIDIA'S CAMPUS IN SANTA CLARA.
 *
 * Two buildings, drawn loosely from how they stand. On the left, Voyager — a
 * tall glass hall under one broad, dark roof that runs out past the glass on
 * slim columns, with the terraced green "mountain" that fills its inside
 * showing through the curtain wall. On the right, Endeavor — low, on a
 * triangular plan, seen from its prow, its roof a field of triangles, a band
 * of triangles running round the edge of it. Behind them, the Santa Cruz
 * mountains; in front, lawns, a path to the door, a street.
 *
 * Everything here is geometry in one world of 1600 × 1000 units. It is
 * described once and becomes three things:
 *
 * - `ink`, the pencil drawing, in the order the hand draws it;
 * - washes, sorted into the layer they belong to — `build` (painted once, the
 *   same in every season) or one of the four seasons' layers (the trees, the
 *   grass, the snow);
 * - the fittings the living scene needs: where the lit windows are, the
 *   triangles that carry light round the roof at night, the tree crowns leaves
 *   fall from, the paths people walk, the lanes the traffic takes.
 *
 * Nothing in this file draws. `film.ts` decides when.
 */

import { between, pick, rng, type Rng } from './random';
import { blob, Wash, type Pt, type WashStyle } from './wash';
import { curve, hatch, pencil, ruled, type Stroke } from './pencil';

export const WORLD = { w: 1600, h: 1000 };
/** The part of the world that is painted: the vignette, with room for the tallest crown. */
export const PAINTED = { x: 20, y: 160, w: 1560, h: 820 };

export const SEASONS = ['spring', 'summer', 'autumn', 'winter'] as const;
export type Season = (typeof SEASONS)[number];

export interface Tree {
  x: number;
  base: number;
  /** Centre and radius of the crown, for the leaves and petals that fall from it. */
  cx: number;
  cy: number;
  r: number;
  kind: 'oak' | 'blossom' | 'palm' | 'street';
}

export interface Walk {
  /** A path through the world, and how wide the walkers on it spread. */
  path: Pt[];
  spread: number;
  /** Share of the people who walk here. */
  weight: number;
  /** People end the walk by going through a door, not off the edge of the picture. */
  door?: boolean;
}

export interface Window {
  quad: [Pt, Pt, Pt, Pt];
  warm: boolean;
}

export interface Campus {
  ink: Stroke[];
  build: Wash[];
  seasons: Record<Season, Wash[]>;
  windows: Window[];
  /** The roof edge's band of triangles, left to right, lit in sequence at night. */
  fascia: [Pt, Pt, Pt][];
  /** The roof's skylights. */
  skylights: [Pt, Pt, Pt][];
  lamps: Pt[];
  trees: Tree[];
  walks: Walk[];
  /** Where people stand and talk, under Voyager's roof. */
  terrace: { x0: number; x1: number; y: number };
  lanes: { y: number; dir: 1 | -1; scale: number }[];
  horizon: number;
}

/* ------------------------------------------------------------------ *
 * The palette — watercolour pigments, not the site's acrylics.        *
 * ------------------------------------------------------------------ */

const PAINT = {
  glass: '#8ea9bd',
  glassDeep: '#5f7f98',
  metal: '#6e737b',
  metalDark: '#4a4f58',
  soffit: '#9aa0a8',
  skylight: '#a8c8d6',
  mountainFar: '#aab3cb',
  mountain: '#8793b3',
  paving: '#bdb4a5',
  road: '#8b909c',
  kerb: '#a79f93',
  inside: '#6f9a5a',
  insideRock: '#9c9384',
  trunk: '#6d5a4a',
};

const GRASS: Record<Season, [string, string]> = {
  spring: ['#9dbb5e', '#7fa84c'],
  summer: ['#7ea443', '#b5b85a'],
  autumn: ['#c2a453', '#a88d45'],
  winter: ['#e9eef5', '#cbd5e4'],
};

const CROWN: Record<Season, string[]> = {
  spring: ['#9cc45a', '#78ad4b', '#b4d173'],
  summer: ['#4d8a34', '#3f7a33', '#6fa443', '#2f6a35'],
  autumn: ['#e08a2b', '#d4602a', '#eba42c', '#b8392c', '#c9772e'],
  winter: [],
};
const BLOSSOM = ['#f2a9bb', '#e98aa5', '#f7c6d2'];
const AUTUMN_RED = ['#b8322a', '#cf4a3a', '#9f2d3a'];
const FROND: Record<Season, string[]> = {
  spring: ['#6f9e47', '#86b152'],
  summer: ['#4f8a38', '#6a9c3f'],
  autumn: ['#7f9a45', '#9aa24a'],
  winter: ['#6c8f55', '#7d9a5f'],
};

/* ------------------------------------------------------------------ *
 * Small geometry                                                      *
 * ------------------------------------------------------------------ */

const at = (a: Pt, b: Pt, t: number): Pt => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

export function buildCampus(seed = 17): Campus {
  const r = rng(seed);
  const ink: Stroke[] = [];
  const build: Wash[] = [];
  const seasons: Record<Season, Wash[]> = { spring: [], summer: [], autumn: [], winter: [] };
  const windows: Window[] = [];
  const fascia: [Pt, Pt, Pt][] = [];
  const skylights: [Pt, Pt, Pt][] = [];
  const lamps: Pt[] = [];
  const trees: Tree[] = [];

  const line = (a: Pt, b: Pt, style?: Parameters<typeof pencil>[2], twice = 0.3) => ink.push(...ruled(a, b, r, style, twice));
  const path = (pts: Pt[], style?: Parameters<typeof pencil>[2]) => ink.push(pencil(pts, r, style));
  const paint = (into: Wash[], poly: Pt[], style: WashStyle) => into.push(new Wash(poly, style, r));
  const everySeason = (fn: (s: Season, into: Wash[]) => void) => SEASONS.forEach((s) => fn(s, seasons[s]));

  // The washes go down in the order they are described — background first,
  // the way a painter works. The pencil goes the other way: the subject
  // first, then what it stands on, then what surrounds it. Each block marks
  // which pass of the drawing its strokes belong to.
  const stageOf: number[] = [];
  const stage = (n: number) => {
    while (stageOf.length < ink.length) stageOf.push(n);
  };

  const HORIZON = 400;

  /* ---------------- the ground, first as a line ---------------- */

  line([90, 832], [1520, 832], { tone: 0.55 }, 0);
  line([70, 849], [1540, 849], { tone: 0.6 }, 0.2);
  line([60, 907], [1545, 907], { tone: 0.6 }, 0.2);
  stage(3);

  /* ---------------- the mountains ---------------- */

  const ridgeL: Pt[] = [[40, 426], [90, 402], [140, 396], [175, 384], [210, 380]];
  const ridgeR: Pt[] = [[800, 394], [860, 381], [930, 388], [1010, 366], [1090, 376], [1170, 356], [1250, 371], [1330, 362], [1400, 380], [1470, 388], [1560, 414]];
  path(curve(ridgeL, 5), { tone: 0.35, width: 0.9 });
  path(curve(ridgeR, 5), { tone: 0.35, width: 0.9 });
  // A farther, paler range behind the first.
  paint(build, [[760, 400], [900, 360], [1080, 346], [1260, 338], [1420, 352], [1580, 392], [1580, 440], [760, 440]], { color: PAINT.mountainFar, layers: 10, alpha: 0.045, spread: 0.35, edge: 0.2 });
  paint(build, [...ridgeR, [1560, 470], [800, 470]], { color: PAINT.mountain, layers: 12, alpha: 0.06, spread: 0.28, edge: 0.5 });
  paint(build, [...ridgeL, [210, 470], [40, 470]], { color: PAINT.mountain, layers: 10, alpha: 0.05, spread: 0.3, edge: 0.4 });
  stage(5);

  /* ---------------- Voyager ---------------- */

  const vTL: Pt = [230, 362];
  const vTR: Pt = [760, 404];
  const vBR: Pt = [760, 622];
  const vBL: Pt = [230, 612];
  // The roof: one slab, running out over the terrace on the left.
  const sTL: Pt = [104, 328];
  const sTR: Pt = [806, 386];
  const sBL: Pt = [104, 344];
  const sBR: Pt = [806, 402];

  line(sTL, sTR, { width: 1.3, tone: 0.9 }, 0.5);
  line(sBL, sBR, { width: 1.2, tone: 0.85 }, 0.4);
  line(sTL, sBL, { width: 1.2 }, 0);
  line(sTR, sBR, { width: 1.2 }, 0);
  // Its edge is a trellis of triangles.
  const nTri = 34;
  for (let i = 0; i < nTri; i++) {
    const a = at(sBL, sBR, i / nTri);
    const b = at(sTL, sTR, (i + 0.5) / nTri);
    const c = at(sBL, sBR, (i + 1) / nTri);
    ink.push(pencil([a, b, c], r, { width: 0.7, tone: 0.5, wobble: 0.2, overshoot: 0.5 }));
  }
  // Glass: the frame, then the mullions and floors.
  line(vTL, vBL, { width: 1.2 }, 0.2);
  line(vTR, vBR, { width: 1.2 }, 0.2);
  line(vBL, vBR, { width: 1.2 }, 0.3);
  line(vTL, vTR, { width: 1 }, 0);
  // Slim columns carrying the roof over the terrace.
  for (const x of [128, 180]) {
    const top = 344 + ((x - 104) / 702) * 58;
    line([x, top], [x, 610], { width: 1.1, tone: 0.8 }, 0);
  }
  const vCols = 18;
  const vFloors = [0.27, 0.52, 0.76];
  for (let i = 1; i < vCols; i++) {
    const t = i / vCols;
    line(at(vTL, vTR, t), at(vBL, vBR, t), { width: 0.7, tone: 0.45, overshoot: 0.5 }, 0);
  }
  for (const f of vFloors) line(at(vTL, vBL, f), at(vTR, vBR, f), { width: 0.8, tone: 0.55 }, 0.2);
  // The lit windows at night: the curtain wall's panes, row by row.
  const rowsV = [0, ...vFloors, 1];
  for (let i = 0; i < vCols; i++) {
    for (let j = 0; j < rowsV.length - 1; j++) {
      if (r() < 0.62) continue;
      const t0 = i / vCols;
      const t1 = (i + 1) / vCols;
      const top0 = at(vTL, vTR, t0);
      const top1 = at(vTL, vTR, t1);
      const bot0 = at(vBL, vBR, t0);
      const bot1 = at(vBL, vBR, t1);
      windows.push({ quad: [at(top0, bot0, rowsV[j]), at(top1, bot1, rowsV[j]), at(top1, bot1, rowsV[j + 1]), at(top0, bot0, rowsV[j + 1])], warm: r() < 0.8 });
    }
  }
  // The mountain inside, seen through the glass: terraces of planting.
  const inside: Pt[] = [[236, 612], [290, 566], [350, 548], [410, 508], [470, 480], [530, 450], [590, 462], [640, 500], [700, 536], [754, 552], [754, 620]];
  path(curve(inside.slice(0, 10), 4), { tone: 0.45, width: 0.8 });
  for (let k = 0; k < 7; k++) {
    const y = 470 + k * 20;
    const x0 = 520 - k * 38 + between(r, -6, 6);
    const x1 = 560 + k * 26 + between(r, -6, 6);
    path([[x0, y], [x1, y + 2]], { tone: 0.35, width: 0.7 });
  }

  paint(build, [sTL, sTR, sBR, sBL], { color: PAINT.metalDark, layers: 14, alpha: 0.1, spread: 0.12, edge: 0.6 });
  paint(build, [sBL, sBR, [760, 406], [230, 366], [104, 352]], { color: PAINT.soffit, layers: 8, alpha: 0.06, spread: 0.15 });
  paint(build, [vTL, vTR, vBR, vBL], { color: PAINT.glass, layers: 16, alpha: 0.06, spread: 0.1, edge: 0.6 });
  // Reflections: the sky caught in the glass as long diagonal streaks.
  for (let k = 0; k < 4; k++) {
    const x = 260 + k * 130 + between(r, -20, 20);
    paint(build, [[x, 370 + k * 10], [x + 60, 376 + k * 10], [x - 30, 612], [x - 80, 612]], { color: PAINT.glassDeep, layers: 6, alpha: 0.05, spread: 0.2, edge: 0 });
  }
  paint(build, inside, { color: PAINT.inside, layers: 12, alpha: 0.07, spread: 0.25, edge: 0.4 });
  paint(build, [[400, 520], [470, 486], [530, 458], [590, 470], [620, 500], [520, 520]], { color: PAINT.insideRock, layers: 6, alpha: 0.06, spread: 0.3 });

  stage(1);

  /* ---------------- Endeavor ---------------- */

  const eAg: Pt = [850, 596];
  const ePg: Pt = [1150, 668];
  const eBg: Pt = [1470, 590];
  const eA: Pt = [850, 522];
  const eP: Pt = [1150, 580];
  const eB: Pt = [1470, 515];
  const eA2: Pt = [846, 502];
  const eP2: Pt = [1150, 556];
  const eB2: Pt = [1474, 494];

  // Roof edge and the prow first — the hand finds the shape before the detail.
  line(eA2, eP2, { width: 1.3, tone: 0.9 }, 0.5);
  line(eP2, eB2, { width: 1.3, tone: 0.9 }, 0.5);
  line(eA2, eB2, { width: 1, tone: 0.6 }, 0.2);
  line(eP2, ePg, { width: 1.3, tone: 0.95 }, 0.5);
  line(eA2, eAg, { width: 1.1 }, 0);
  line(eB2, eBg, { width: 1.1 }, 0);
  line(eAg, ePg, { width: 1.2 }, 0.3);
  line(ePg, eBg, { width: 1.2 }, 0.3);
  line(eA, eP, { width: 1, tone: 0.8 }, 0);
  line(eP, eB, { width: 1, tone: 0.8 }, 0);

  // The band of triangles under the roof edge, round both faces.
  const band = (top0: Pt, top1: Pt, bot0: Pt, bot1: Pt, n: number) => {
    for (let i = 0; i < n; i++) {
      const a = at(bot0, bot1, i / n);
      const b = at(top0, top1, (i + 0.5) / n);
      const c = at(bot0, bot1, (i + 1) / n);
      ink.push(pencil([a, b, c], r, { width: 0.7, tone: 0.5, wobble: 0.2, overshoot: 0.4 }));
      fascia.push([a, b, c]);
    }
  };
  band(eA2, eP2, eA, eP, 22);
  band(eP2, eB2, eP, eB, 24);

  // The roof: a triangle cut into triangles — the building's signature.
  const n = 11;
  const bary = (i: number, j: number): Pt => {
    // Point i steps from the prow toward A2, j steps toward B2.
    const u = i / n;
    const v = j / n;
    return [eP2[0] + (eA2[0] - eP2[0]) * u + (eB2[0] - eP2[0]) * v, eP2[1] + (eA2[1] - eP2[1]) * u + (eB2[1] - eP2[1]) * v];
  };
  for (let k = 1; k < n; k++) {
    ink.push(pencil([bary(k, 0), bary(0, k)], r, { width: 0.6, tone: 0.32, wobble: 0.2, overshoot: 0.5 }));
    ink.push(pencil([bary(k, 0), bary(k, n - k)], r, { width: 0.6, tone: 0.32, wobble: 0.2, overshoot: 0.5 }));
    ink.push(pencil([bary(0, k), bary(n - k, k)], r, { width: 0.6, tone: 0.32, wobble: 0.2, overshoot: 0.5 }));
  }
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n - i; j++) {
      skylights.push([bary(i, j), bary(i + 1, j), bary(i, j + 1)]);
    }
  }

  // Glass: panes down both faces, one floor line, the door at the prow.
  const face = (top0: Pt, top1: Pt, bot0: Pt, bot1: Pt, cols: number) => {
    for (let i = 1; i < cols; i++) line(at(top0, top1, i / cols), at(bot0, bot1, i / cols), { width: 0.7, tone: 0.45, overshoot: 0.5 }, 0);
    line(at(top0, bot0, 0.5), at(top1, bot1, 0.5), { width: 0.8, tone: 0.5 }, 0.2);
    for (let i = 0; i < cols; i++) {
      for (const [f0, f1] of [[0, 0.5], [0.5, 1]] as const) {
        if (r() < 0.55) continue;
        const t0 = i / cols;
        const t1 = (i + 1) / cols;
        const a0 = at(top0, top1, t0);
        const a1 = at(top0, top1, t1);
        const b0 = at(bot0, bot1, t0);
        const b1 = at(bot0, bot1, t1);
        windows.push({ quad: [at(a0, b0, f0), at(a1, b1, f0), at(a1, b1, f1), at(a0, b0, f1)], warm: r() < 0.6 });
      }
    }
  };
  face(eA, eP, eAg, ePg, 12);
  face(eP, eB, ePg, eBg, 13);
  // The entrance: a glass canopy on the prow and dark doors under it.
  path([[1112, 612], [1150, 626], [1190, 610]], { width: 1.1, tone: 0.85 });
  line([1128, 628], [1128, 662], { width: 0.9 }, 0);
  line([1172, 626], [1172, 660], { width: 0.9 }, 0);

  paint(build, [eA2, eP2, eB2], { color: PAINT.metal, layers: 12, alpha: 0.06, spread: 0.08, edge: 0.5 });
  for (const t of skylights) if (r() < 0.5) build.push(new Wash([...t], { color: PAINT.skylight, layers: 3, alpha: 0.18, spread: 0.05, edge: 0 }, r));
  paint(build, [eA2, eP2, eP, eA], { color: PAINT.metalDark, layers: 10, alpha: 0.08, spread: 0.08, edge: 0.4 });
  paint(build, [eP2, eB2, eB, eP], { color: PAINT.metal, layers: 10, alpha: 0.08, spread: 0.08, edge: 0.4 });
  paint(build, [eA, eP, ePg, eAg], { color: PAINT.glassDeep, layers: 14, alpha: 0.06, spread: 0.1, edge: 0.5 });
  paint(build, [eP, eB, eBg, ePg], { color: PAINT.glass, layers: 14, alpha: 0.06, spread: 0.1, edge: 0.5 });
  paint(build, [[1128, 628], [1172, 626], [1172, 662], [1128, 664]], { color: '#3e4250', layers: 8, alpha: 0.12, spread: 0.1 });

  stage(2);

  /* ---------------- the ground ---------------- */

  const paving: Pt[] = [[104, 610], [230, 614], [760, 624], [850, 598], [1150, 670], [1470, 592], [1530, 598], [1530, 614], [1150, 692], [850, 618], [760, 644], [104, 634]];
  paint(build, paving, { color: PAINT.paving, layers: 10, alpha: 0.07, spread: 0.12, edge: 0.3 });
  path([[104, 634], [760, 644], [850, 618], [1150, 692], [1530, 614]], { tone: 0.4, width: 0.8 });
  // The path to the door, widening toward us.
  const walkL: Pt[] = [[1128, 690], [1082, 832]];
  const walkR: Pt[] = [[1172, 690], [1222, 832]];
  paint(build, [walkL[0], walkR[0], walkR[1], walkL[1]], { color: PAINT.paving, layers: 10, alpha: 0.08, spread: 0.1, edge: 0.4 });
  line(walkL[0], walkL[1], { tone: 0.6 }, 0.2);
  line(walkR[0], walkR[1], { tone: 0.6 }, 0.2);
  for (let k = 1; k < 9; k++) {
    const t = k / 9;
    line(at(walkL[0], walkL[1], t), at(walkR[0], walkR[1], t), { width: 0.6, tone: 0.3, overshoot: 0 }, 0);
  }
  // A diagonal path across the lawn, the way people actually cut across.
  const diag: Pt[] = [[318, 832], [372, 832], [598, 644], [566, 643]];
  paint(build, diag, { color: PAINT.paving, layers: 8, alpha: 0.07, spread: 0.12, edge: 0.3 });
  line(diag[0], diag[3], { tone: 0.45 }, 0);
  line(diag[1], diag[2], { tone: 0.45 }, 0);

  paint(build, [[60, 834], [1540, 834], [1544, 848], [58, 848]], { color: PAINT.kerb, layers: 8, alpha: 0.07, spread: 0.12 });
  paint(build, [[40, 851], [1560, 851], [1566, 907], [34, 907]], { color: PAINT.road, layers: 14, alpha: 0.07, spread: 0.14, edge: 0.5 });
  for (let x = 70; x < 1520; x += 64) line([x, 878], [x + 30, 878], { width: 0.9, tone: 0.55, overshoot: 0 }, 0);

  stage(4);

  // Street lamps: a slim stem and a head that curves out over the pavement.
  for (const x of [150, 420, 700, 1000, 1290, 1500]) {
    path([[x, 842], [x, 770]], { width: 1, tone: 0.8, overshoot: 0 });
    path(curve([[x, 772], [x + 4, 762], [x + 16, 760]], 5), { width: 1, tone: 0.8, overshoot: 0 });
    lamps.push([x + 15, 763]);
  }

  stage(6);

  // Grass, by season.
  // The lawns' outer edges are left ragged, where the brush ran out.
  const lawnL: Pt[] = [[96, 636], [760, 646], [850, 620], [1128, 692], [1082, 830], [372, 830], [598, 646], [566, 645], [318, 830], [84, 830], [58, 792], [80, 748], [48, 704], [74, 668]];
  const lawnR: Pt[] = [[1172, 694], [1470, 616], [1534, 616], [1560, 660], [1536, 712], [1568, 764], [1546, 830], [1222, 830]];
  const verge: Pt[] = [[70, 910], [1540, 910], [1500, 932], [1380, 946], [1180, 938], [900, 956], [620, 944], [360, 958], [140, 944]];
  everySeason((s, into) => {
    const [g0, g1] = GRASS[s];
    const alpha = s === 'winter' ? 0.14 : 0.07;
    paint(into, lawnL, { color: g0, layers: 14, alpha, spread: 0.12, edge: 0.4 });
    paint(into, lawnR, { color: g0, layers: 14, alpha, spread: 0.12, edge: 0.4 });
    paint(into, verge, { color: g0, layers: 10, alpha: alpha * 0.8, spread: 0.3, edge: 0.3 });
    // A darker drift of the second colour through the grass.
    paint(into, [[160, 700], [700, 690], [640, 790], [220, 800]], { color: g1, layers: 8, alpha: alpha * 0.7, spread: 0.35, edge: 0.1 });
    paint(into, [[1260, 720], [1500, 690], [1510, 800], [1300, 810]], { color: g1, layers: 8, alpha: alpha * 0.7, spread: 0.35, edge: 0.1 });
    if (s === 'winter') {
      // Snow on the roofs and along the kerb.
      paint(into, [sTL, sTR, [806, 392], [104, 334]], { color: '#f4f6fa', layers: 10, alpha: 0.35, spread: 0.08, edge: 0.2 });
      paint(into, [eA2, eP2, eB2], { color: '#eef2f8', layers: 10, alpha: 0.22, spread: 0.06, edge: 0.3 });
      paint(into, [[60, 846], [1540, 846], [1540, 856], [60, 858]], { color: '#e8edf5', layers: 8, alpha: 0.25, spread: 0.2 });
      paint(into, [[40, 900], [1560, 900], [1560, 912], [40, 914]], { color: '#e8edf5', layers: 8, alpha: 0.25, spread: 0.2 });
      paint(into, [...ridgeR.slice(2, 9), [1330, 380], [1170, 372], [1010, 382]], { color: '#f6f8fb', layers: 8, alpha: 0.3, spread: 0.2 });
    }
  });
  // Grass tufts in pencil, a few.
  for (let k = 0; k < 26; k++) {
    const x = between(r, 110, 1500);
    const y = between(r, 700, 826);
    if (x > 1060 && x < 1240) continue;
    path([[x - 3, y], [x - 1, y - 5]], { width: 0.6, tone: 0.35, overshoot: 0 });
    path([[x + 1, y], [x + 3, y - 6]], { width: 0.6, tone: 0.35, overshoot: 0 });
  }

  stage(9);

  /* ---------------- trees ---------------- */

  const branchesOf = (x: number, base: number, h: number, spread: number, depth: number) => {
    const fork: Pt = [x + between(r, -4, 4), base - h * 0.42];
    // The trunk, two edges tapering.
    const w = Math.max(2.5, h * 0.028);
    path([[x - w, base], [fork[0] - w * 0.5, fork[1]]], { width: 1, tone: 0.8 });
    path([[x + w, base], [fork[0] + w * 0.5, fork[1]]], { width: 1, tone: 0.8 });
    const grow = (from: Pt, angle: number, len: number, d: number) => {
      const to: Pt = [from[0] + Math.cos(angle) * len, from[1] + Math.sin(angle) * len];
      const mid: Pt = [(from[0] + to[0]) / 2 + between(r, -len, len) * 0.08, (from[1] + to[1]) / 2 + between(r, -len, len) * 0.08];
      path(curve([from, mid, to], 4), { width: Math.max(0.5, 0.35 + d * 0.3), tone: 0.55 + d * 0.08, overshoot: 0.5 });
      if (d <= 0) return;
      const kids = d > 1 ? 3 : 2;
      for (let k = 0; k < kids; k++) grow(to, angle + between(r, -0.6, 0.6), len * between(r, 0.55, 0.75), d - 1);
    };
    const n = 4;
    for (let k = 0; k < n; k++) {
      const a = -Math.PI / 2 + ((k / (n - 1)) - 0.5) * spread + between(r, -0.15, 0.15);
      grow(fork, a, h * between(r, 0.26, 0.34), depth);
    }
    return fork;
  };

  const crown = (t: Tree, colours: Record<Season, string[]>, blossom = false) => {
    everySeason((s, into) => {
      const cols = s === 'spring' && blossom ? BLOSSOM : colours[s];
      if (!cols.length) {
        // Winter: bare branches, a little snow caught on the crown.
        for (let k = 0; k < 5; k++) {
          const a = between(r, Math.PI * 1.1, Math.PI * 1.9);
          paint(into, blob(t.cx + Math.cos(a) * t.r * 0.6, t.cy + Math.sin(a) * t.r * 0.5, t.r * 0.18, t.r * 0.05, r, 7), { color: '#f3f5f9', layers: 5, alpha: 0.28, spread: 0.3, edge: 0.2 });
        }
        return;
      }
      const count = Math.round(7 + t.r / 14);
      for (let k = 0; k < count; k++) {
        const a = between(r, 0, Math.PI * 2);
        const d = Math.sqrt(r()) * t.r * 0.62;
        const cx = t.cx + Math.cos(a) * d;
        const cy = t.cy + Math.sin(a) * d * 0.8;
        // Shade falls on the lower right: darker blobs there.
        const shade = cy > t.cy && cx > t.cx - t.r * 0.2;
        const col = shade ? cols[Math.min(cols.length - 1, 1 + (k % 2))] : pick(r, cols);
        paint(into, blob(cx, cy, t.r * between(r, 0.3, 0.46), t.r * between(r, 0.26, 0.4), r), { color: col, layers: 12, alpha: 0.075, spread: 0.32, edge: 0.55 });
      }
      if (s === 'autumn' && !blossom) {
        paint(into, blob(t.cx + t.r * 0.3, t.cy + t.r * 0.2, t.r * 0.35, t.r * 0.28, r), { color: pick(r, AUTUMN_RED), layers: 10, alpha: 0.07, spread: 0.3, edge: 0.5 });
      }
      if (s === 'spring' && blossom) {
        paint(into, blob(t.cx - t.r * 0.2, t.cy + t.r * 0.25, t.r * 0.35, t.r * 0.25, r), { color: '#9cc45a', layers: 8, alpha: 0.05, spread: 0.3, edge: 0.3 });
      }
      // Splatter: the flick of a loaded brush around the crown.
      for (let k = 0; k < 10; k++) {
        const a = between(r, 0, Math.PI * 2);
        const d = t.r * between(r, 0.8, 1.25);
        const size = between(r, 1.2, 3.2);
        paint(into, blob(t.cx + Math.cos(a) * d, t.cy + Math.sin(a) * d * 0.85, size, size, r, 6), { color: pick(r, cols), layers: 3, alpha: 0.3, spread: 0.2, edge: 0 });
      }
    });
  };

  const oak = (x: number, base: number, h: number, kind: Tree['kind'], blossom = false) => {
    const fork = branchesOf(x, base, h, 1.6, kind === 'street' ? 1 : 2);
    const t: Tree = { x, base, cx: fork[0], cy: base - h * 0.66, r: h * 0.36, kind };
    trees.push(t);
    crown(t, CROWN, blossom);
  };

  const palm = (x: number, base: number, h: number) => {
    const lean = between(r, -18, 18);
    const top: Pt = [x + lean, base - h];
    const trunk = curve([[x, base], [x + lean * 0.3, base - h * 0.5], top], 8);
    ink.push(pencil(trunk, r, { width: 1.1, tone: 0.8 }));
    ink.push(pencil(trunk.map(([px, py]) => [px + 4, py] as Pt), r, { width: 0.9, tone: 0.6 }));
    for (let k = 1; k < 12; k++) {
      const p = trunk[Math.floor((k / 12) * (trunk.length - 1))];
      path([[p[0] - 1, p[1]], [p[0] + 5, p[1] + 1]], { width: 0.6, tone: 0.4, overshoot: 0 });
    }
    // Fronds arch up out of the crown and droop under their own weight; the
    // leaflets hang from them in short ticks.
    const fronds: Pt[][] = [];
    const count = 11;
    for (let k = 0; k < count; k++) {
      const side = ((k + 0.5) / count) * 2 - 1 + between(r, -0.08, 0.08);
      const len = h * between(r, 0.2, 0.27);
      const lift = (1 - Math.abs(side)) * len * 0.45;
      const f = curve([top, [top[0] + side * len * 0.45, top[1] - lift - 4], [top[0] + side * len * 0.85, top[1] - lift * 0.3 + len * 0.1], [top[0] + side * len, top[1] + len * 0.42]], 5);
      fronds.push(f);
      ink.push(pencil(f, r, { width: 0.8, tone: 0.65, overshoot: 0 }));
      for (let i = 3; i < f.length - 1; i += 2) {
        const [fx, fy] = f[i];
        path([[fx, fy], [fx + side * 2, fy + 6]], { width: 0.5, tone: 0.35, overshoot: 0, wobble: 0.1 });
      }
    }
    trees.push({ x, base, cx: top[0], cy: top[1] + 10, r: h * 0.2, kind: 'palm' });
    everySeason((s, into) => {
      for (const f of fronds) {
        // A leaf-shaped strip along each frond: widest in the middle, the
        // leaflets' fringe hanging below.
        const upper: Pt[] = [];
        const lower: Pt[] = [];
        f.forEach(([fx, fy], i) => {
          const w = Math.sin((i / (f.length - 1)) * Math.PI) * 5;
          upper.push([fx, fy - w * 0.4]);
          lower.push([fx, fy + w * 1.4]);
        });
        paint(into, [...upper, ...lower.reverse()], { color: pick(r, FROND[s]), layers: 7, alpha: 0.11, spread: 0.25, edge: 0.5, grain: 8 });
      }
      if (s === 'winter') paint(into, blob(top[0], top[1] - 2, 16, 4, r), { color: '#f3f5f9', layers: 5, alpha: 0.3, spread: 0.3 });
    });
  };

  const shrubs = (from: Pt, to: Pt, count: number, size: number) => {
    for (let k = 0; k < count; k++) {
      const [x, y] = at(from, to, (k + 0.5) / count);
      const w = size * between(r, 0.8, 1.2);
      path(curve([[x - w, y], [x - w * 0.8, y - w * 0.7], [x, y - w], [x + w * 0.8, y - w * 0.6], [x + w, y]], 3), { width: 0.7, tone: 0.5, overshoot: 0 });
      everySeason((s, into) => {
        const cols = s === 'winter' ? ['#e8edf4'] : s === 'autumn' ? AUTUMN_RED.concat(CROWN.autumn) : CROWN[s];
        paint(into, blob(x, y - w * 0.45, w * 1.05, w * 0.6, r, 8), { color: pick(r, cols), layers: 8, alpha: s === 'winter' ? 0.22 : 0.08, spread: 0.3, edge: 0.5 });
      });
    }
  };

  shrubs([248, 626], [740, 634], 10, 11);
  shrubs([870, 612], [1100, 668], 6, 10);
  shrubs([1205, 664], [1450, 606], 7, 10);

  oak(92, 640, 262, 'oak');
  palm(690, 648, 300);
  oak(812, 632, 214, 'blossom', true);
  palm(1340, 656, 266);
  oak(1520, 626, 228, 'oak');
  oak(186, 842, 150, 'street', true);
  oak(470, 842, 138, 'street');
  oak(952, 842, 146, 'street', true);
  oak(1400, 842, 140, 'street');

  stage(7);
  // A few strokes of hatching: the shadow under Voyager's roof, the prow's shade.
  ink.push(...hatch(236, 372, 750, 392, 9, -5, r, { tone: 0.25 }));
  ink.push(...hatch(1156, 588, 1460, 596, 11, -4, r, { tone: 0.2 }));
  stage(8);
  const drawn = ink.map((s, i) => [s, stageOf[i], i] as const).sort((a, b) => a[1] - b[1] || a[2] - b[2]).map(([s]) => s);

  const walks: Walk[] = [
    { path: [[100, 624], [760, 634], [850, 610], [1150, 680], [1520, 604]], spread: 6, weight: 3 },
    { path: [[40, 840], [1560, 840]], spread: 4, weight: 3 },
    { path: [[1150, 678], [1150, 836]], spread: 14, weight: 2, door: true },
    { path: [[345, 832], [582, 645]], spread: 8, weight: 1.5 },
  ];

  return {
    ink: drawn,
    build,
    seasons,
    windows,
    fascia,
    skylights,
    lamps,
    trees,
    walks,
    terrace: { x0: 112, x1: 222, y: 612 },
    lanes: [
      { y: 866, dir: 1, scale: 0.92 },
      { y: 894, dir: -1, scale: 1 },
    ],
    horizon: HORIZON,
  };
}
