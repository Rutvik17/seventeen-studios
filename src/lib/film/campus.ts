/**
 * THE SUBJECT: NVIDIA'S CAMPUS IN SANTA CLARA, FROM THE AIR.
 *
 * Drawn from the published facts of the two buildings, not from a guess at
 * their silhouettes:
 *
 * - **Endeavor** (2017): a triangular floor plate with beveled corners, two
 *   storeys, about 250,000 sq ft a floor. The roof is one undulating triangle
 *   pierced by triangular skylights; the walls are a sloped glass curtain wall
 *   of 12 ft × 4 ft panels framed along their horizontal edges, under a deep
 *   soffit.
 * - **Voyager** (2022): the larger triangle, four storeys and 68 ft tall, the
 *   same triangulated roof and sloped glass. On its southeast side, over the
 *   main entrance, a 70 ft steel trellis carries a 240 ft wide canopy of solar
 *   panels.
 * - Between them, a four-acre park, crossed by a tree-lined walk shaded with
 *   solar panels from one building to the other. San Tomas Expressway runs
 *   down the west side.
 *
 * Everything is described on a PLAN, in metres (x east, y north, z up), and
 * projected through one camera — high to the south, looking north and down —
 * so the buildings, the park, the roads, the trees, the people and the cars
 * all share one perspective. Nothing on screen is placed by eye.
 *
 * Out of the geometry come three things:
 *
 * - `ink`, the pencil drawing, in the order the hand draws it;
 * - washes, sorted into the `build` layer (painted once) or one of the four
 *   seasons' layers (trees, grass, snow);
 * - the fittings the living scene needs: lit windows, glowing skylights,
 *   lamps, tree crowns, and the paths people walk and lanes cars drive — kept
 *   on the plan, for `life.ts` to project as they move.
 */

import { between, pick, rng } from './random';
import { blob, Wash, type Pt, type WashStyle } from './wash';
import { curve, pencil, ruled, type Stroke } from './pencil';

/** The world the projection draws into: 1600 × 1000 units. */
export const WORLD = { w: 1600, h: 1000 };
/** The part of the world that is painted: the vignette, with room for the hills. */
export const PAINTED = { x: 0, y: 170, w: 1600, h: 800 };

export const SEASONS = ['spring', 'summer', 'autumn', 'winter'] as const;
export type Season = (typeof SEASONS)[number];

/* ------------------------------------------------------------------ *
 * The camera                                                          *
 * ------------------------------------------------------------------ */

// High to the south, 21° down, far enough back to take in both buildings,
// the park and the streets, with the hills and the sky above.
const PITCH = (21 * Math.PI) / 180;
const CAM_H = 280;
const CAM_Y = -660;
const FOCAL = 1700;
const CX = 800;
const CY = 575;
const cosP = Math.cos(PITCH);
const sinP = Math.sin(PITCH);

/** A point on the plan, `z` metres up, into the world the film draws in. */
export function proj(x: number, y: number, z = 0): Pt {
  const qy = y - CAM_Y;
  const qz = z - CAM_H;
  const depth = qy * cosP - qz * sinP;
  const up = qy * sinP + qz * cosP;
  return [CX + (x / depth) * FOCAL, CY - (up / depth) * FOCAL];
}

/** World units per metre at a point on the plan. */
export function scaleAt(x: number, y: number, z = 0): number {
  return FOCAL / ((y - CAM_Y) * cosP - (z - CAM_H) * sinP);
}

/** How much a circle on the ground is squashed on screen: the sine of the view's pitch, near enough. */
export const GROUND_SQUASH = Math.sin(PITCH + 0.12);

export type P3 = readonly [number, number, number];

export interface Tree {
  /** On screen, in world units: the crown, for leaves and petals to fall from. */
  cx: number;
  cy: number;
  r: number;
  base: number;
  kind: 'shade' | 'blossom' | 'palm' | 'street';
}

export interface Walk {
  /** A path on the plan, in metres. */
  path: Pt[];
  spread: number;
  weight: number;
  /** People start or end this walk at a door, and fade there. */
  door?: boolean;
}

export interface Lane {
  /** The lane's centre line on the plan, in the direction of travel. */
  path: Pt[];
}

export interface Window {
  quad: [Pt, Pt, Pt, Pt];
  warm: boolean;
}

export interface Campus {
  ink: Stroke[];
  build: Wash[];
  /** Each season's trees and snow: painted over the buildings. */
  seasons: Record<Season, Wash[]>;
  /** Each season's grass: painted under them. */
  ground: Record<Season, Wash[]>;
  windows: Window[];
  /** Endeavor's roof edge, as a band of triangles lit in sequence at night. */
  fascia: [Pt, Pt, Pt][];
  skylights: [Pt, Pt, Pt][];
  lamps: Pt[];
  /** Where each lamp stands, for its reflection in a wet street. */
  lampFeet: Pt[];
  trees: Tree[];
  walks: Walk[];
  /** Where people stand and talk: under Voyager's canopy, on the plan. */
  terrace: Pt[];
  lanes: Lane[];
  /** Hard surfaces the rain splashes on, as plan rectangles [x0, y0, x1, y1]. */
  wet: [number, number, number, number][];
}

/* ------------------------------------------------------------------ *
 * The palette — watercolour pigments                                  *
 * ------------------------------------------------------------------ */

const PAINT = {
  roof: '#5d626b',
  roofLight: '#7c818a',
  skylight: '#cfe0ea',
  glass: '#7f9db5',
  glassDeep: '#566f88',
  soffit: '#a3a7ad',
  solar: '#2f3f6a',
  paving: '#c9c0b0',
  road: '#8b909c',
  garage: '#bdb6aa',
  far: '#b9b3a6',
  hills: '#8f98b6',
  hillsFar: '#aeb5cc',
};

const GRASS: Record<Season, [string, string]> = {
  spring: ['#9dbb5e', '#7fa84c'],
  summer: ['#86a846', '#b3b35a'],
  autumn: ['#c2a453', '#a88d45'],
  winter: ['#edf1f7', '#cfd8e6'],
};
const CROWN: Record<Season, string[]> = {
  spring: ['#9cc45a', '#78ad4b', '#b4d173'],
  summer: ['#4d8a34', '#3f7a33', '#6fa443', '#2f6a35'],
  autumn: ['#e08a2b', '#d4602a', '#eba42c', '#b8392c', '#c9772e'],
  winter: [],
};
const BLOSSOM = ['#f2a9bb', '#e98aa5', '#f7c6d2'];
const EVERGREEN: Record<Season, string[]> = {
  spring: ['#5f8f45', '#4d7d3c'],
  summer: ['#4a7d38', '#3d6d33'],
  autumn: ['#587a3c', '#6b8440'],
  winter: ['#5b7a55', '#4e6c4c'],
};

/* ------------------------------------------------------------------ *
 * Plan geometry                                                       *
 * ------------------------------------------------------------------ */

/** A triangle with beveled corners, counter-clockwise on the plan. `rot` is the direction of its first vertex. */
function bevelled(cx: number, cy: number, side: number, rot: number, bevel: number): Pt[] {
  const R = side / Math.sqrt(3);
  const v: Pt[] = [0, 1, 2].map((k) => [cx + Math.cos(rot + (k * 2 * Math.PI) / 3) * R, cy + Math.sin(rot + (k * 2 * Math.PI) / 3) * R]);
  const out: Pt[] = [];
  for (let k = 0; k < 3; k++) {
    const a = v[k];
    const toward = (b: Pt): Pt => {
      const d = Math.hypot(b[0] - a[0], b[1] - a[1]);
      return [a[0] + ((b[0] - a[0]) / d) * bevel, a[1] + ((b[1] - a[1]) / d) * bevel];
    };
    out.push(toward(v[(k + 2) % 3]), toward(v[(k + 1) % 3]));
  }
  return out;
}

/** Shrink a convex plan toward its centre by `d` metres (negative grows it). */
function inset(poly: Pt[], d: number): Pt[] {
  const cx = poly.reduce((a, p) => a + p[0], 0) / poly.length;
  const cy = poly.reduce((a, p) => a + p[1], 0) / poly.length;
  return poly.map(([x, y]) => {
    const l = Math.hypot(x - cx, y - cy);
    return [cx + ((x - cx) * (l - d)) / l, cy + ((y - cy) * (l - d)) / l] as Pt;
  });
}

function inside(poly: Pt[], x: number, y: number): boolean {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}

const lerp2 = (a: Pt, b: Pt, t: number): Pt => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

export function buildCampus(seed = 17): Campus {
  const r = rng(seed);
  const ink: Stroke[] = [];
  const build: Wash[] = [];
  // Ground-level paint — roads, paving, parking, shadows — goes down before any building.
  const under: Wash[] = [];
  const seasons: Record<Season, Wash[]> = { spring: [], summer: [], autumn: [], winter: [] };
  const ground: Record<Season, Wash[]> = { spring: [], summer: [], autumn: [], winter: [] };
  const windows: Window[] = [];
  const fascia: [Pt, Pt, Pt][] = [];
  const skylights: [Pt, Pt, Pt][] = [];
  const lamps: Pt[] = [];
  const lampFeet: Pt[] = [];
  const trees: Tree[] = [];

  // The washes go down in the order they are described; the pencil in the
  // order of its stages — the buildings first, then what they stand on, then
  // what surrounds them.
  const stageOf: number[] = [];
  const stage = (n: number) => {
    while (stageOf.length < ink.length) stageOf.push(n);
  };

  const P = (x: number, y: number, z = 0) => proj(x, y, z);
  const flat = (poly: Pt[], z = 0) => poly.map(([x, y]) => P(x, y, z));
  type Style = Parameters<typeof pencil>[2];
  const line3 = (a: P3, b: P3, style?: Style, twice = 0.25) => ink.push(...ruled(P(a[0], a[1], a[2]), P(b[0], b[1], b[2]), r, style, twice));
  const lineOn = (a: Pt, b: Pt, z: number, style?: Style, twice = 0.25) => line3([a[0], a[1], z], [b[0], b[1], z], style, twice);
  const post = (x: number, y: number, z0: number, z1: number, style?: Style) => ink.push(pencil([P(x, y, z0), P(x, y, z1)], r, { overshoot: 0, ...style }));
  const outline = (poly: Pt[], z: number, style?: Style) => {
    for (let i = 0; i < poly.length; i++) lineOn(poly[i], poly[(i + 1) % poly.length], z, style, 0.35);
  };
  const paint = (into: Wash[], poly: Pt[], style: WashStyle) => into.push(new Wash(poly, style, r));
  const everySeason = (fn: (s: Season, into: Wash[]) => void) => SEASONS.forEach((s) => fn(s, seasons[s]));
  const everyGround = (fn: (s: Season, into: Wash[]) => void) => SEASONS.forEach((s) => fn(s, ground[s]));
  /** Is the outward face of plan edge a→b turned toward the camera? */
  const facing = (a: Pt, b: Pt) => {
    const nx = b[1] - a[1];
    const ny = -(b[0] - a[0]);
    const mx = (a[0] + b[0]) / 2;
    const my = (a[1] + b[1]) / 2;
    return nx * (0 - mx) + ny * (CAM_Y - my) > 0;
  };

  /* ---------------- a building: sloped glass under a triangulated roof ---------------- */

  const building = (o: { cx: number; cy: number; side: number; rot: number; bevel: number; glass: number; roof: number; floors: number; lattice: number; skyShare: number }) => {
    const top = bevelled(o.cx, o.cy, o.side, o.rot, o.bevel);
    // The glass slopes: it meets the ground a few metres in from the roof's edge.
    const foot = inset(top, 5);
    const n = top.length;

    for (let i = 0; i < n; i++) {
      const a = top[i];
      const b = top[(i + 1) % n];
      if (!facing(a, b)) continue;
      const fa = foot[i];
      const fb = foot[(i + 1) % n];
      const q: Pt[] = [P(fa[0], fa[1], 0), P(fb[0], fb[1], 0), P(b[0], b[1], o.glass), P(a[0], a[1], o.glass)];
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      paint(build, q, { color: len > o.bevel * 2 ? PAINT.glass : PAINT.glassDeep, layers: 12, alpha: 0.075, spread: 0.1, edge: 0.5, grain: 14 });
      // Sky caught in the glass, in long diagonal streaks.
      for (let k = 0; k < 3; k++) {
        const t = between(r, 0.1, 0.85);
        paint(build, [lerp2(q[3], q[2], t), lerp2(q[3], q[2], t + 0.06), lerp2(q[0], q[1], t + 0.01), lerp2(q[0], q[1], t - 0.05)], { color: '#dfe8ef', layers: 4, alpha: 0.1, spread: 0.1, edge: 0 });
      }
      // The fascia: the roof's edge above the glass.
      paint(build, [P(a[0], a[1], o.glass), P(b[0], b[1], o.glass), P(b[0], b[1], o.roof), P(a[0], a[1], o.roof)], { color: PAINT.soffit, layers: 8, alpha: 0.09, spread: 0.08, edge: 0.4 });
      lineOn(fa, fb, 0, { width: 1.1 }, 0.3);
      lineOn(a, b, o.glass, { width: 0.9, tone: 0.75 }, 0);
      line3([fa[0], fa[1], 0], [a[0], a[1], o.glass], { width: 0.9 }, 0);
      // Four-foot panels framed along their horizontal edges: the glass is banded, floors darker.
      const bands = Math.round(o.glass / 2.4);
      const perFloor = Math.max(1, Math.round(bands / o.floors));
      for (let k = 1; k < bands; k++) {
        const t = k / bands;
        lineOn(lerp2(fa, a, t), lerp2(fb, b, t), o.glass * t, { width: 0.5, tone: k % perFloor === 0 ? 0.5 : 0.2, overshoot: 0, wobble: 0.25 }, 0);
      }
      // Faint vertical joints, and the panes lit at night floor by floor.
      const cols = Math.max(1, Math.round(len / 11));
      const at = (tt: number, zz: number) => {
        const u = zz / o.glass;
        const p = lerp2(lerp2(fa, fb, tt), lerp2(a, b, tt), u);
        return P(p[0], p[1], zz);
      };
      for (let k = 0; k < cols; k++) {
        if (k > 0) ink.push(pencil([at(k / cols, 0), at(k / cols, o.glass)], r, { width: 0.45, tone: 0.18, overshoot: 0, wobble: 0.2 }));
        for (let f = 0; f < o.floors; f++) {
          if (r() < 0.55) continue;
          const z0 = (o.glass / o.floors) * f + 0.6;
          const z1 = (o.glass / o.floors) * (f + 1) - 0.6;
          windows.push({ quad: [at(k / cols, z0), at((k + 1) / cols, z0), at((k + 1) / cols, z1), at(k / cols, z1)], warm: r() < 0.75 });
        }
      }
    }

    // The roof: one triangle, gently undulating toward its middle.
    const edgeDist = (x: number, y: number) =>
      Math.min(
        ...top.map((p, i) => {
          const q = top[(i + 1) % n];
          const ex = q[0] - p[0];
          const ey = q[1] - p[1];
          return Math.abs((x - p[0]) * ey - (y - p[1]) * ex) / Math.hypot(ex, ey);
        }),
      );
    const roofZ = (x: number, y: number) => o.roof + Math.min(1, edgeDist(x, y) / 40) * (2 + 2.5 * Math.sin(x * 0.045 + y * 0.03));
    const onRoof = (p: Pt) => P(p[0], p[1], roofZ(p[0], p[1]));
    paint(build, flat(top, o.roof), { color: PAINT.roof, layers: 16, alpha: 0.075, spread: 0.06, edge: 0.6, grain: 16 });
    paint(build, flat(inset(top, 30), o.roof + 3), { color: PAINT.roofLight, layers: 8, alpha: 0.05, spread: 0.2, edge: 0.2 });
    outline(top, o.roof, { width: 1.3, tone: 0.9 });

    // The lattice: the triangle before its corners were cut, divided into small ones.
    const R = o.side / Math.sqrt(3);
    const V: Pt[] = [0, 1, 2].map((k) => [o.cx + Math.cos(o.rot + (k * 2 * Math.PI) / 3) * R, o.cy + Math.sin(o.rot + (k * 2 * Math.PI) / 3) * R]);
    const m = o.lattice;
    const bary = (i: number, j: number): Pt => [
      V[0][0] + (V[1][0] - V[0][0]) * (i / m) + (V[2][0] - V[0][0]) * (j / m),
      V[0][1] + (V[1][1] - V[0][1]) * (i / m) + (V[2][1] - V[0][1]) * (j / m),
    ];
    const within = inset(top, 2);
    for (let k = 2; k < m - 1; k += 2) {
      for (const [a, b] of [[bary(k, 0), bary(0, k)], [bary(k, 0), bary(k, m - k)], [bary(0, k), bary(m - k, k)]] as [Pt, Pt][]) {
        const pts: Pt[] = [];
        for (let s = 0; s <= 14; s++) {
          const p = lerp2(a, b, s / 14);
          if (inside(within, p[0], p[1])) pts.push(onRoof(p));
        }
        if (pts.length > 2) ink.push(pencil(pts, r, { width: 0.45, tone: 0.2, wobble: 0.2, overshoot: 0 }));
      }
    }
    // Skylights: small triangles, in drifts rather than evenly.
    const room = inset(top, 8);
    for (let i = 0; i < m; i++) {
      for (let j = 0; j < m - i; j++) {
        const tri: Pt[] = [bary(i, j), bary(i + 1, j), bary(i, j + 1)];
        const c: Pt = [(tri[0][0] + tri[1][0] + tri[2][0]) / 3, (tri[0][1] + tri[1][1] + tri[2][1]) / 3];
        if (!inside(room, c[0], c[1])) continue;
        const drift = 0.5 + 0.5 * Math.sin(c[0] * 0.05) * Math.cos(c[1] * 0.04);
        if (r() > o.skyShare * (0.4 + drift)) continue;
        const s = tri.map((p) => onRoof(lerp2(c, p, 0.62))) as [Pt, Pt, Pt];
        skylights.push(s);
        build.push(new Wash([...s], { color: PAINT.skylight, layers: 3, alpha: 0.26, spread: 0.04, edge: 0, grain: 30 }, r));
        ink.push(pencil([s[0], s[1], s[2], s[0]], r, { width: 0.45, tone: 0.35, wobble: 0.1, overshoot: 0 }));
      }
    }
    return top;
  };

  /* ---------------- Endeavor ---------------- */

  // One vertex points south, toward the camera, so its two south faces are seen.
  const endeavor = building({ cx: 110, cy: 0, side: 232, rot: -Math.PI / 2, bevel: 28, glass: 12, roof: 15, floors: 2, lattice: 18, skyShare: 0.32 });
  // Its roof edge as a band of triangles round the faces we see — lit in sequence at night.
  for (let i = 0; i < endeavor.length; i++) {
    const a = endeavor[i];
    const b = endeavor[(i + 1) % endeavor.length];
    if (!facing(a, b)) continue;
    const k = Math.max(2, Math.round(Math.hypot(b[0] - a[0], b[1] - a[1]) / 7));
    for (let j = 0; j < k; j++) {
      const p0 = lerp2(a, b, j / k);
      const p1 = lerp2(a, b, (j + 0.5) / k);
      const p2 = lerp2(a, b, (j + 1) / k);
      fascia.push([P(p0[0], p0[1], 12), P(p1[0], p1[1], 15), P(p2[0], p2[1], 12)]);
    }
  }
  stage(1);

  /* ---------------- Voyager, and its trellis ---------------- */

  // A flat side faces southeast, toward Endeavor and the park: the entrance.
  const voyager = building({ cx: -150, cy: 255, side: 272, rot: (3 * Math.PI) / 4, bevel: 32, glass: 19, roof: 21, floors: 4, lattice: 20, skyShare: 0.22 });
  let se: [Pt, Pt] = [voyager[0], voyager[1]];
  let best = -Infinity;
  for (let i = 0; i < voyager.length; i++) {
    const a = voyager[i];
    const b = voyager[(i + 1) % voyager.length];
    const nx = b[1] - a[1];
    const ny = -(b[0] - a[0]);
    const score = (nx - ny) / Math.hypot(nx, ny) + Math.hypot(b[0] - a[0], b[1] - a[1]) / 1000;
    if (score > best) {
      best = score;
      se = [a, b];
    }
  }
  stage(2);

  // The canopy: 240 ft (73 m) wide, 70 ft (21 m) up, reaching out over the forecourt.
  const [sa, sb] = se;
  const mid = lerp2(sa, sb, 0.5);
  const sl = Math.hypot(sb[0] - sa[0], sb[1] - sa[1]);
  const along: Pt = [(sb[0] - sa[0]) / sl, (sb[1] - sa[1]) / sl];
  const out: Pt = [along[1], -along[0]];
  const CZ = 21.5;
  const cpt = (u: number, v: number): Pt => [mid[0] + along[0] * u * 36.5 + out[0] * (v * 52 + 2), mid[1] + along[1] * u * 36.5 + out[1] * (v * 52 + 2)];
  const canopy: Pt[] = [cpt(-1, 0), cpt(1, 0), cpt(1, 1), cpt(-1, 1)];
  const forecourt = [cpt(-1.25, 0), cpt(1.25, 0), cpt(1.3, 1.35), cpt(-1.3, 1.35)];
  paint(under, flat(forecourt), { color: PAINT.paving, layers: 10, alpha: 0.07, spread: 0.08, edge: 0.3 });
  // Its shadow falls on the forecourt below.
  paint(under, flat(canopy.map(([x, y]) => [x + 6, y - 14] as Pt)), { color: '#8e8a86', layers: 8, alpha: 0.06, spread: 0.1, edge: 0.2 });
  // The steel trees that hold it up: a trunk, then branches to the canopy.
  for (const u of [-0.6, 0, 0.6]) {
    const [bx, by] = cpt(u, 0.55);
    post(bx, by, 0, 11, { width: 1.1, tone: 0.8 });
    for (const [du, dv] of [[-0.18, -0.2], [0.18, -0.2], [0, 0.3]]) {
      const tip = cpt(u + du, 0.55 + dv);
      line3([bx, by, 11], [tip[0], tip[1], CZ - 0.5], { width: 0.8, tone: 0.7, overshoot: 0 }, 0);
    }
  }
  paint(build, flat(canopy, CZ), { color: PAINT.solar, layers: 12, alpha: 0.08, spread: 0.06, edge: 0.5 });
  outline(canopy, CZ, { width: 1.1, tone: 0.9 });
  for (let k = 1; k < 10; k++) lineOn(cpt(-1 + (k / 10) * 2, 0), cpt(-1 + (k / 10) * 2, 1), CZ, { width: 0.5, tone: 0.4, overshoot: 0 }, 0);
  for (let k = 1; k < 5; k++) lineOn(cpt(-1, k / 5), cpt(1, k / 5), CZ, { width: 0.5, tone: 0.4, overshoot: 0 }, 0);
  for (let k = 0; k < 5; k++) lineOn(cpt(-1 + k * 0.4, 0), cpt(-0.6 + k * 0.4, 1), CZ, { width: 0.4, tone: 0.25, overshoot: 0 }, 0);
  stage(3);

  /* ---------------- the ground ---------------- */

  const groundPoly: Pt[] = [[-300, -120], [-60, -128], [200, -124], [440, -120], [470, 60], [455, 260], [470, 480], [300, 560], [40, 590], [-220, 560], [-300, 420], [-285, 200]];
  // The park fills everything between the two buildings and runs on east past Endeavor.
  const park: Pt[] = [[-140, 100], [-40, 76], [120, 78], [250, 74], [330, 64], [326, 290], [220, 300], [80, 310], [-10, 262], [-100, 190]];
  const plazaE = inset(endeavor, -14);
  const plazaV = inset(voyager, -12);

  // The ground itself: the pale of paving and dry earth, everywhere on the campus.
  paint(under, flat(groundPoly), { color: '#d6ccba', layers: 12, alpha: 0.06, spread: 0.18, edge: 0.3, grain: 30 });
  // Lawns: the park, the lawn along the south street, and the green to the north and east.
  const lawns: Pt[][] = [
    park,
    [[-300, -118], [470, -118], [470, 40], [330, 60], [250, 70], [190, 60], [-60, 50], [-62, -96], [-300, -96]],
    [[-300, 46], [-150, 50], [-110, 180], [-240, 330], [-300, 300]],
    [[240, 290], [468, 280], [470, 480], [300, 556], [230, 520]],
    [[-290, 440], [-60, 470], [220, 470], [300, 552], [40, 588], [-220, 558]],
    [[190, 70], [320, 60], [322, 280], [236, 280]],
  ];
  everyGround((s, into) => {
    const [g0, g1] = GRASS[s];
    const alpha = s === 'winter' ? 0.13 : 0.075;
    lawns.forEach((lawn, i) => paint(into, flat(lawn), { color: i === 0 ? g1 : g0, layers: 12, alpha, spread: 0.14, edge: 0.4, grain: 20 }));
    // Winter lies on everything.
    if (s === 'winter') paint(into, flat(groundPoly), { color: '#eef2f8', layers: 10, alpha: 0.12, spread: 0.2, edge: 0.2, grain: 30 });
  });
  everySeason((s, into) => {
    if (s !== 'winter') return;
    paint(into, flat(inset(endeavor, 3), 15.5), { color: '#f6f8fb', layers: 10, alpha: 0.22, spread: 0.1, edge: 0.3 });
    paint(into, flat(inset(voyager, 3), 21.5), { color: '#f6f8fb', layers: 10, alpha: 0.22, spread: 0.1, edge: 0.3 });
    paint(into, flat(canopy, CZ + 0.2), { color: '#f6f8fb', layers: 8, alpha: 0.2, spread: 0.1, edge: 0.3 });
  });
  // A surface car park between the expressway and Endeavor, in rows.
  const lot: Pt[] = [[-290, -96], [-70, -96], [-70, 40], [-290, 40]];
  paint(under, flat(lot), { color: '#a9a9ad', layers: 10, alpha: 0.07, spread: 0.08, edge: 0.4 });
  outline(lot, 0, { width: 0.6, tone: 0.4 });
  const parked = ['#e9e4d8', '#3a3d46', '#8fa9bd', '#c8423a', '#f2efe8', '#6b6f78', '#2b3f9e'];
  for (let row = 0; row < 5; row++) {
    const y = -84 + row * 27;
    lineOn([-284, y + 6], [-76, y + 6], 0, { width: 0.4, tone: 0.25, overshoot: 0 }, 0);
    for (let x = -282; x < -80; x += 4.2) {
      if (r() < 0.3) continue;
      for (const dy of [0, 7.5]) {
        const car: Pt[] = [[x + 0.6, y + dy], [x + 3.2, y + dy], [x + 3.2, y + dy + 4.6], [x + 0.6, y + dy + 4.6]];
        under.push(new Wash(flat(car, 0.8), { color: pick(r, parked), layers: 2, alpha: 0.5, spread: 0.02, edge: 0, grain: 40 }, r));
      }
    }
  }
  paint(under, flat(plazaE), { color: PAINT.paving, layers: 10, alpha: 0.07, spread: 0.08, edge: 0.3 });
  paint(under, flat(plazaV), { color: PAINT.paving, layers: 10, alpha: 0.07, spread: 0.08, edge: 0.3 });
  outline(plazaE, 0, { width: 0.6, tone: 0.35 });

  // The walk from Endeavor to Voyager: shaded by a strip of solar panels, trees either side.
  const walkA = lerp2(plazaE[3], plazaE[4], 0.5);
  const walkB = cpt(0, 1.35);
  const wl = Math.hypot(walkB[0] - walkA[0], walkB[1] - walkA[1]);
  const wn: Pt = [-(walkB[1] - walkA[1]) / wl, (walkB[0] - walkA[0]) / wl];
  const side = (p: Pt, d: number): Pt => [p[0] + wn[0] * d, p[1] + wn[1] * d];
  paint(under, flat([side(walkA, -5), side(walkA, 5), side(walkB, 5), side(walkB, -5)]), { color: PAINT.paving, layers: 10, alpha: 0.08, spread: 0.08, edge: 0.3 });
  lineOn(side(walkA, -5), side(walkB, -5), 0, { width: 0.6, tone: 0.4 }, 0);
  lineOn(side(walkA, 5), side(walkB, 5), 0, { width: 0.6, tone: 0.4 }, 0);
  const shade = [side(lerp2(walkA, walkB, 0.08), -3), side(lerp2(walkA, walkB, 0.08), 3), side(lerp2(walkA, walkB, 0.92), 3), side(lerp2(walkA, walkB, 0.92), -3)];
  paint(build, flat(shade, 4.5), { color: PAINT.solar, layers: 8, alpha: 0.09, spread: 0.06, edge: 0.4 });
  outline(shade, 4.5, { width: 0.7, tone: 0.6 });
  const parkPath: Pt[] = [[-120, 110], [-40, 150], [30, 120]];
  paint(under, flat([[-122, 106], [-40, 146], [30, 116], [32, 124], [-40, 154], [-118, 114]]), { color: PAINT.paving, layers: 6, alpha: 0.07, spread: 0.1 });

  // San Tomas Expressway down the west side; a street along the south.
  paint(under, flat([[-350, -200], [-310, -200], [-310, 620], [-350, 620]]), { color: PAINT.road, layers: 12, alpha: 0.075, spread: 0.08, edge: 0.4 });
  paint(under, flat([[-350, -152], [520, -152], [520, -128], [-350, -128]]), { color: PAINT.road, layers: 12, alpha: 0.075, spread: 0.08, edge: 0.4 });
  for (const x of [-350, -310]) line3([x, -200, 0], [x, 620, 0], { width: 0.8, tone: 0.55 }, 0.2);
  line3([-330, -200, 0], [-330, 620, 0], { width: 0.6, tone: 0.3 }, 0);
  for (const y of [-152, -128]) line3([-310, y, 0], [520, y, 0], { width: 0.8, tone: 0.55 }, 0.2);
  for (let x = -290; x < 500; x += 16) line3([x, -140, 0], [x + 8, -140, 0], { width: 0.6, tone: 0.4, overshoot: 0 }, 0);
  // Street lamps along both roads.
  const lampAt: Pt[] = [...Array.from({ length: 14 }, (_, k) => [-270 + k * 55, -124] as Pt), ...Array.from({ length: 11 }, (_, k) => [-305, -100 + k * 60] as Pt)];
  for (const [lx, ly] of lampAt) {
    post(lx, ly, 0, 9, { width: 0.6, tone: 0.55 });
    lamps.push(P(lx, ly, 9));
    lampFeet.push(P(lx, ly - 4, 0));
  }
  stage(4);

  // A parking structure on the east side, solar panels on its top deck.
  const gar: Pt[] = [[330, 70], [420, 70], [420, 270], [330, 270]];
  const GZ = 14;
  for (let i = 0; i < 4; i++) {
    const a = gar[i];
    const b = gar[(i + 1) % 4];
    if (!facing(a, b)) continue;
    paint(build, [P(a[0], a[1], 0), P(b[0], b[1], 0), P(b[0], b[1], GZ), P(a[0], a[1], GZ)], { color: PAINT.garage, layers: 8, alpha: 0.09, spread: 0.08, edge: 0.4 });
    for (const z of [0, 3.5, 7, 10.5, 14]) lineOn(a, b, z, { width: z === 0 || z === GZ ? 1 : 0.5, tone: z === 0 || z === GZ ? 0.8 : 0.4 }, 0);
    post(a[0], a[1], 0, GZ, { width: 0.9 });
    post(b[0], b[1], 0, GZ, { width: 0.9 });
  }
  paint(build, flat(gar, GZ), { color: '#cfc8bc', layers: 8, alpha: 0.08, spread: 0.08, edge: 0.4 });
  outline(gar, GZ, { width: 1, tone: 0.8 });
  for (let k = 0; k < 6; k++) {
    const y0 = 88 + k * 30;
    const panel: Pt[] = [[342, y0], [408, y0], [408, y0 + 16], [342, y0 + 16]];
    paint(build, flat(panel, GZ + 2.5), { color: PAINT.solar, layers: 6, alpha: 0.1, spread: 0.05, edge: 0.4 });
    outline(panel, GZ + 2.5, { width: 0.5, tone: 0.5 });
  }

  // Santa Clara beyond: low buildings, fading with distance.
  for (let k = 0; k < 16; k++) {
    const x = between(r, -520, 560);
    const y = between(r, 600, 1000);
    if (x > -380 && x < -290) continue;
    const w = between(r, 40, 110);
    const d = between(r, 30, 70);
    const h = between(r, 6, 14);
    const box: Pt[] = [[x, y], [x + w, y], [x + w, y + d], [x, y + d]];
    const fade = 1 - (y - 600) / 500;
    paint(build, [P(x, y, 0), P(x + w, y, 0), P(x + w, y, h), P(x, y, h)], { color: PAINT.far, layers: 6, alpha: 0.06 * fade, spread: 0.1, edge: 0.3 });
    paint(build, flat(box, h), { color: '#cfcac0', layers: 5, alpha: 0.06 * fade, spread: 0.1 });
    outline(box, h, { width: 0.5, tone: 0.25 * fade });
    lineOn([x, y], [x + w, y], 0, { width: 0.5, tone: 0.25 * fade }, 0);
  }
  stage(6);

  // The Santa Cruz mountains, far off, above the town.
  const hy = P(0, 1150, 0)[1];
  const ridge: Pt[] = [[20, hy + 30], [160, hy - 4], [300, hy - 20], [430, hy - 6], [560, hy - 34], [700, hy - 18], [840, hy - 42], [980, hy - 24], [1120, hy - 36], [1260, hy - 12], [1400, hy - 22], [1580, hy + 20]];
  ink.push(pencil(curve(ridge, 5), r, { width: 0.8, tone: 0.3 }));
  paint(build, [...ridge.map(([x, y]) => [x, y - 26] as Pt), [1400, hy + 8], [900, hy + 16], [400, hy + 6], [20, hy + 14]], { color: PAINT.hillsFar, layers: 10, alpha: 0.04, spread: 0.3, edge: 0.2, grain: 26 });
  paint(build, [...ridge, [1500, hy + 40], [1200, hy + 56], [900, hy + 36], [600, hy + 58], [300, hy + 38], [60, hy + 50]], { color: PAINT.hills, layers: 12, alpha: 0.055, spread: 0.3, edge: 0.3, grain: 26 });
  everySeason((s, into) => {
    if (s === 'winter') paint(into, [ridge[4], ridge[5], ridge[6], ridge[7], ridge[8], [1120, hy - 20], [840, hy - 26], [560, hy - 20]], { color: '#f6f8fb', layers: 8, alpha: 0.28, spread: 0.2 });
  });
  stage(7);

  /* ---------------- trees ---------------- */

  // A tree standing behind a building is hidden by it: from up here its crown
  // would land on the roof, so it is not drawn at all.
  const roofs = [flat(endeavor, 15), flat(voyager, 21), flat(canopy, CZ)];
  const tree = (x: number, y: number, kind: Tree['kind'], size = 1) => {
    const top = P(x, y, (kind === 'palm' ? 16 : 10) * size * 0.75);
    if (roofs.some((roof) => inside(roof, top[0], top[1] + 4))) return;
    const s = scaleAt(x, y);
    const h = (kind === 'palm' ? 16 : 10) * size;
    const [bx, by] = P(x, y, 0);
    const [tx, ty] = P(x, y, h * 0.75);
    const rad = (kind === 'palm' ? 3.5 : 5.5) * size * s;
    trees.push({ cx: tx, cy: ty, r: rad, base: by, kind });
    // Its shadow, cast to the northeast.
    paint(under, blob(bx + rad * 0.5, by - rad * 0.15, rad * 0.9, rad * 0.35, r, 7), { color: '#6b6a70', layers: 4, alpha: 0.07, spread: 0.2, edge: 0 });
    ink.push(pencil([[bx, by], [tx, ty + rad * 0.3]], r, { width: 0.7, tone: 0.6, overshoot: 0 }));
    if (kind === 'palm') {
      for (let k = 0; k < 7; k++) {
        const a = (k / 7) * Math.PI * 2;
        const end: Pt = [tx + Math.cos(a) * rad * 1.4, ty + Math.sin(a) * rad * 0.7 + rad * 0.3];
        ink.push(pencil(curve([[tx, ty], [(tx + end[0]) / 2, (ty + end[1]) / 2 - rad * 0.35], end], 3), r, { width: 0.5, tone: 0.5, overshoot: 0 }));
      }
    } else {
      for (let k = 0; k < 3; k++) {
        const a = -Math.PI / 2 + (k - 1) * 0.7;
        ink.push(pencil([[tx, ty + rad * 0.3], [tx + Math.cos(a) * rad * 0.7, ty + rad * 0.3 + Math.sin(a) * rad * 0.7]], r, { width: 0.5, tone: 0.45, overshoot: 0 }));
      }
    }
    everySeason((season, into) => {
      if (kind === 'palm') {
        paint(into, blob(tx, ty + rad * 0.2, rad * 1.3, rad * 0.65, r, 9), { color: pick(r, EVERGREEN[season]), layers: 8, alpha: 0.1, spread: 0.4, edge: 0.5 });
        return;
      }
      const cols = kind === 'blossom' && season === 'spring' ? BLOSSOM : CROWN[season];
      if (!cols.length) {
        paint(into, blob(tx, ty, rad * 0.5, rad * 0.2, r, 7), { color: '#f3f5f9', layers: 4, alpha: 0.28, spread: 0.3 });
        return;
      }
      for (let k = 0; k < 3; k++) {
        const col = k === 2 ? cols[Math.min(cols.length - 1, 1)] : pick(r, cols);
        paint(into, blob(tx + between(r, -0.35, 0.35) * rad, ty + between(r, -0.3, 0.3) * rad, rad * between(r, 0.6, 0.85), rad * between(r, 0.5, 0.7), r), { color: col, layers: 9, alpha: 0.085, spread: 0.3, edge: 0.55 });
      }
      if (r() < 0.3) {
        const sz = between(r, 0.6, 1.4);
        paint(into, blob(tx + rad * 1.2, ty - rad * 0.4, sz, sz, r, 5), { color: pick(r, cols), layers: 2, alpha: 0.35, spread: 0.2, edge: 0 });
      }
    });
  };

  // Along the walk, both sides.
  for (let t = 0.1; t < 0.95; t += 0.1) {
    const p = lerp2(walkA, walkB, t);
    tree(...side(p, -10), t < 0.5 ? 'blossom' : 'shade');
    tree(...side(p, 10), 'shade');
  }
  // The park: groves, not a scatter — trees gather in clumps with open lawn between.
  const vFoot = inset(voyager, -6);
  const groves: Pt[] = [[40, 120], [150, 200], [260, 140], [230, 250], [-40, 190], [300, 90]];
  for (const [gx, gy] of groves) {
    for (let k = 0; k < 9; k++) {
      const x = gx + between(r, -28, 28);
      const y = gy + between(r, -22, 22);
      if (inside(park, x, y) && !inside(vFoot, x, y) && !inside(inset(endeavor, -6), x, y)) tree(x, y, r() < 0.25 ? 'blossom' : 'shade', between(r, 0.8, 1.35));
    }
  }
  // Trees between the rows of the car park.
  for (let row = 0; row < 4; row++) for (let x = -270; x < -80; x += 36) tree(x + between(r, -3, 3), -66 + row * 27 + 1.5, 'street', 0.7);
  // Round Voyager's plaza.
  const ringV = inset(voyager, -22);
  for (let k = 0; k < ringV.length; k++) {
    const a = ringV[k];
    const b = ringV[(k + 1) % ringV.length];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    for (let t = 0.15; t < 0.9; t += 30 / len) {
      const p = lerp2(a, b, t);
      if (!inside(inset(voyager, -8), p[0], p[1]) && Math.hypot(p[0] - mid[0], p[1] - mid[1]) > 50) tree(p[0], p[1], 'shade', 0.9);
    }
  }
  // Round Endeavor's plaza, along the streets, and in the far corners.
  const ringT = inset(endeavor, -24);
  for (let k = 0; k < ringT.length; k++) {
    const a = ringT[k];
    const b = ringT[(k + 1) % ringT.length];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    for (let t = 0.15; t < 0.9; t += 26 / len) tree(...lerp2(a, b, t), 'shade', 0.9);
  }
  for (let x = -260; x < 480; x += 34) tree(x, -112, Math.round(x / 34) % 3 === 0 ? 'palm' : 'street', 0.85);
  for (let y = -80; y < 540; y += 38) tree(-292, y, 'street', 0.85);
  for (let k = 0; k < 10; k++) tree(between(r, 250, 440), between(r, 300, 540), 'shade', between(r, 0.8, 1.2));
  for (let k = 0; k < 8; k++) tree(between(r, -285, -200), between(r, 400, 560), 'shade', between(r, 0.8, 1.2));
  stage(9);

  const drawn = ink.map((s, i) => [s, stageOf[i] ?? 9, i] as const).sort((a, b) => a[1] - b[1] || a[2] - b[2]).map(([s]) => s);

  const ringE = inset(endeavor, -9);
  return {
    ink: drawn,
    build: [...under, ...build],
    seasons,
    ground,
    windows,
    fascia,
    skylights,
    lamps,
    lampFeet,
    trees,
    walks: [
      { path: [walkA, walkB], spread: 2.5, weight: 4 },
      { path: [...ringE.slice(1), ringE[0], ringE[1]], spread: 2, weight: 2 },
      { path: [[-300, -122], [500, -122]], spread: 1.5, weight: 2 },
      { path: [[-304, -110], [-304, 520]], spread: 1.2, weight: 1 },
      { path: parkPath, spread: 2, weight: 1.5 },
      { path: [cpt(0, 1.3), cpt(0, 0.05)], spread: 10, weight: 1.5, door: true },
    ],
    terrace: [cpt(-0.5, 0.4), cpt(-0.3, 0.7), cpt(0.35, 0.5), cpt(0.55, 0.8), cpt(0.1, 0.3)],
    lanes: [
      { path: [[-700, -145], [900, -145]] },
      { path: [[900, -135], [-700, -135]] },
      { path: [[-336, -400], [-336, 1100]] },
      { path: [[-324, 1100], [-324, -400]] },
    ],
    wet: [
      [-350, -152, 520, -128],
      [-350, -200, -310, 620],
      [-300, -126, 460, -118],
    ],
  };
}
