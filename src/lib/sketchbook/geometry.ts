/**
 * The founder page's sketchbook: what gets drawn, where, and when.
 *
 * Everything here is pure data and pure functions — no canvas, no DOM — so the
 * share-image script can draw the same bridge the page does, and so every frame
 * of the story is a function of one number, the time. Nothing is accumulated
 * frame to frame: jump to any second and the page looks exactly as it would
 * have if it had played there. That is what makes "skip", "replay" and the
 * reduced-motion storyboard free — they are just other values of `t`.
 *
 * ---
 *
 * THE PAGE
 *
 * All drawing is authored on a virtual page 1200 wide and 900 tall, centred and
 * scaled to fit whatever canvas it lands on. The paper and the grid are drawn
 * in screen space and always fill the canvas; only the drawing is fitted.
 */

export const PAGE = { w: 1200, h: 900 } as const;

export type Pt = { x: number; y: number };

/* ------------------------------------------------------------------ *
 * Randomness that holds still
 * ------------------------------------------------------------------ */

/**
 * A seeded generator (mulberry32). Same seed, same sequence, every time.
 *
 * A sketch drawn with `Math.random()` re-rolls every wobble on every frame and
 * the lines visibly boil. Seeding by stroke means a line is drawn imperfectly
 * once and then stays that way — which is what pencil does.
 */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ------------------------------------------------------------------ *
 * Timeline
 * ------------------------------------------------------------------ */

/** When each scene starts, seconds. The last entry is the end of the story. */
export const SCENES = [0, 4.4, 10.2, 14.6, 20.2, 23.4] as const;
export const END = SCENES[SCENES.length - 1];

/** Moments inside the scenes, seconds. Named so the renderer reads as a script. */
export const T = {
  bookDrawn: 1.3,
  bookOpen: 2.6,
  zoomEnd: 3.6,
  gridIn: [3.2, 4.4],
  sparkIn: [4.4, 5.0],
  headDrawn: 8.8,
  ideaDrawn: 10.0,
  swarm: [10.2, 11.8],
  drops: [10.8, 12.0],
  impact: [11.8, 12.5],
  scatter: [12.2, 14.6],
  hang: [14.6, 15.2],
  gather: [15.2, 17.4],
  clean: [17.0, 19.2],
  wash: [17.8, 20.2],
  settle: [20.2, 21.4],
  card: 20.8,
  button: 21.8,
} as const;

/** Which scene `t` is in, 0-based. */
export function sceneAt(t: number): number {
  for (let i = SCENES.length - 2; i >= 0; i -= 1) if (t >= SCENES[i]) return i;
  return 0;
}

export const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
/** Where `t` is between `a` and `b`, as 0..1. */
export const span = (t: number, a: number, b: number) => clamp01((t - a) / (b - a));
export const easeInOut = (u: number) => (u < 0.5 ? 4 * u * u * u : 1 - (-2 * u + 2) ** 3 / 2);
export const easeOut = (u: number) => 1 - (1 - u) ** 3;
/** Overshoots its target and comes back — the snap of pieces landing. */
export const easeOutBack = (u: number, s = 1.9) => 1 + (s + 1) * (u - 1) ** 3 + s * (u - 1) ** 2;

/* ------------------------------------------------------------------ *
 * Paths
 * ------------------------------------------------------------------ */

/** Catmull–Rom through control points, sampled `per` times per span. */
export function smooth(points: Pt[], per = 10, closed = false): Pt[] {
  const out: Pt[] = [];
  const n = points.length;
  const at = (i: number) =>
    closed ? points[(i + n) % n] : points[Math.max(0, Math.min(n - 1, i))];
  const spans = closed ? n : n - 1;
  for (let i = 0; i < spans; i += 1) {
    const p0 = at(i - 1);
    const p1 = at(i);
    const p2 = at(i + 1);
    const p3 = at(i + 2);
    for (let k = 0; k < per; k += 1) {
      const u = k / per;
      const u2 = u * u;
      const u3 = u2 * u;
      out.push({
        x:
          0.5 *
          (2 * p1.x + (-p0.x + p2.x) * u + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * u2 +
            (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * u3),
        y:
          0.5 *
          (2 * p1.y + (-p0.y + p2.y) * u + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * u2 +
            (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * u3),
      });
    }
  }
  out.push(closed ? { ...points[0] } : { ...points[n - 1] });
  return out;
}

export function line(a: Pt, b: Pt, steps = 12): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i <= steps; i += 1) {
    const u = i / steps;
    out.push({ x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u });
  }
  return out;
}

export function circle(c: Pt, r: number, steps = 64, from = -Math.PI / 2): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i <= steps; i += 1) {
    const a = from + (i / steps) * Math.PI * 2;
    out.push({ x: c.x + Math.cos(a) * r, y: c.y + Math.sin(a) * r });
  }
  return out;
}

export function lengthOf(pts: Pt[]): number {
  let l = 0;
  for (let i = 1; i < pts.length; i += 1) l += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
  return l;
}

/** The point `u` (0..1) of the way along a polyline, by length. */
export function pointAlong(pts: Pt[], u: number): Pt {
  const target = lengthOf(pts) * clamp01(u);
  let run = 0;
  for (let i = 1; i < pts.length; i += 1) {
    const seg = Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
    if (run + seg >= target) {
      const k = seg === 0 ? 0 : (target - run) / seg;
      return {
        x: pts[i - 1].x + (pts[i].x - pts[i - 1].x) * k,
        y: pts[i - 1].y + (pts[i].y - pts[i - 1].y) * k,
      };
    }
    run += seg;
  }
  return { ...pts[pts.length - 1] };
}

/** `n` points evenly spaced along several polylines taken as one. */
export function sampleAlong(paths: Pt[][], n: number): Pt[] {
  const lengths = paths.map(lengthOf);
  const total = lengths.reduce((s, l) => s + l, 0);
  const out: Pt[] = [];
  for (let i = 0; i < n; i += 1) {
    let d = ((i + 0.5) / n) * total;
    let p = 0;
    while (p < paths.length - 1 && d > lengths[p]) {
      d -= lengths[p];
      p += 1;
    }
    out.push(pointAlong(paths[p], lengths[p] ? d / lengths[p] : 0));
  }
  return out;
}

/* ------------------------------------------------------------------ *
 * Scene 1 — the sketchbook
 * ------------------------------------------------------------------ */

/** The closed book, before it slides to centre: cover to the right of the spine. */
export const BOOK = { spine: 600, top: 250, w: 300, h: 400 } as const;

/* ------------------------------------------------------------------ *
 * Scene 2 — the thinker
 * ------------------------------------------------------------------ */

/*
  A head in profile, facing right, authored in a unit box and placed by `head`.
  Traced from nothing but the usual construction: a cranium circle, a brow line
  at about the circle's middle, the face hanging off the front of it.
*/
const PROFILE: Pt[] = [
  { x: 0.3, y: 0.96 },
  { x: 0.32, y: 0.8 },
  { x: 0.25, y: 0.64 },
  { x: 0.22, y: 0.46 },
  { x: 0.28, y: 0.27 },
  { x: 0.43, y: 0.15 },
  { x: 0.6, y: 0.16 },
  { x: 0.71, y: 0.27 },
  { x: 0.745, y: 0.39 },
  { x: 0.735, y: 0.44 },
  { x: 0.785, y: 0.53 },
  { x: 0.815, y: 0.575 },
  { x: 0.765, y: 0.6 },
  { x: 0.775, y: 0.64 },
  { x: 0.755, y: 0.665 },
  { x: 0.775, y: 0.7 },
  { x: 0.745, y: 0.74 },
  { x: 0.765, y: 0.79 },
  { x: 0.67, y: 0.83 },
  { x: 0.62, y: 0.87 },
  { x: 0.62, y: 0.96 },
];

const HEAD_SCALE = 560;
const place = (p: Pt): Pt => ({ x: 600 + (p.x - 0.52) * HEAD_SCALE, y: 450 + (p.y - 0.55) * HEAD_SCALE });

/** Where the idea sits: the middle of the cranium. */
export const CRANIUM = place({ x: 0.47, y: 0.4 });
export const CRANIUM_R = 0.25 * HEAD_SCALE;

/**
 * A seven-pointed star, {7/3}: join every third of seven points round a circle.
 *
 * Seven because the site is Seventeen, and {7/3} because it is the densest
 * seven-pointed star that is still one unbroken line — the spark draws it
 * without lifting.
 */
export function heptagram(c: Pt, r: number): Pt[] {
  const pts: Pt[] = [];
  for (let i = 0; i <= 7; i += 1) {
    const a = -Math.PI / 2 + ((i * 3) % 7) * ((Math.PI * 2) / 7);
    pts.push({ x: c.x + Math.cos(a) * r, y: c.y + Math.sin(a) * r });
  }
  const out: Pt[] = [];
  for (let i = 1; i < pts.length; i += 1) out.push(...line(pts[i - 1], pts[i], 10).slice(i === 1 ? 0 : 1));
  return out;
}

/** The heptagon through the same seven points — the star's own frame. */
export function heptagon(c: Pt, r: number): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i <= 7; i += 1) {
    const a = -Math.PI / 2 + i * ((Math.PI * 2) / 7);
    out.push({ x: c.x + Math.cos(a) * r, y: c.y + Math.sin(a) * r });
  }
  return out;
}

export type Stroke = {
  id: string;
  pts: Pt[];
  /** When the pencil starts and finishes this line, seconds. */
  from: number;
  to: number;
  kind: 'guide' | 'line' | 'idea';
};

const IDEA_R = 74;

/** Scene 2's strokes, in the order the spark draws them. */
export function thinker(): Stroke[] {
  const guideCircle = circle(CRANIUM, CRANIUM_R, 72, Math.PI * 0.9);
  const brow = line(place({ x: 0.2, y: 0.42 }), place({ x: 0.86, y: 0.42 }));
  const axis = line(place({ x: 0.745, y: 0.12 }), place({ x: 0.745, y: 0.9 }));
  const profile = smooth(PROFILE.map(place), 12);
  return [
    { id: 'guide-circle', pts: guideCircle, from: 5.0, to: 5.7, kind: 'guide' },
    { id: 'guide-brow', pts: brow, from: 5.75, to: 5.95, kind: 'guide' },
    { id: 'guide-axis', pts: axis, from: 6.0, to: 6.2, kind: 'guide' },
    { id: 'profile', pts: profile, from: 6.3, to: T.headDrawn, kind: 'line' },
    { id: 'idea-ring', pts: circle(CRANIUM, IDEA_R, 64), from: 8.95, to: 9.3, kind: 'idea' },
    { id: 'idea-frame', pts: heptagon(CRANIUM, IDEA_R), from: 9.3, to: 9.55, kind: 'idea' },
    { id: 'idea-star', pts: heptagram(CRANIUM, IDEA_R), from: 9.55, to: T.ideaDrawn, kind: 'idea' },
  ];
}

/* ------------------------------------------------------------------ *
 * Scene 3 — the block
 * ------------------------------------------------------------------ */

export type Scribble = { pts: Pt[]; from: Pt; to: Pt; delay: number; spin: number; r: number };

/** Tangles of heavy line that swarm the head: creative block, or bugs. */
export function scribbles(): Scribble[] {
  const rand = rng(1717);
  const out: Scribble[] = [];
  const count = 9;
  for (let i = 0; i < count; i += 1) {
    const r = 26 + rand() * 24;
    // A random walk pulled back towards its centre, so it knots rather than wanders.
    const pts: Pt[] = [];
    let x = 0;
    let y = 0;
    let heading = rand() * Math.PI * 2;
    for (let k = 0; k < 70; k += 1) {
      heading += (rand() - 0.5) * 1.9;
      x += Math.cos(heading) * r * 0.32 - x * 0.12;
      y += Math.sin(heading) * r * 0.32 - y * 0.12;
      pts.push({ x, y });
    }
    const around = (i / count) * Math.PI * 2 + rand() * 0.4;
    const ring = 250 + rand() * 90;
    out.push({
      pts,
      from: { x: 600 + Math.cos(around) * 900, y: 450 + Math.sin(around) * 700 },
      to: { x: 600 + Math.cos(around) * ring, y: 440 + Math.sin(around) * ring * 0.8 },
      delay: rand() * 0.6,
      spin: (rand() - 0.5) * 2.4,
      r,
    });
  }
  return out;
}

export type Drop = { at: Pt; r: number; when: number; edge: number[]; splats: { a: number; d: number; r: number }[] };

/** Heavy ink drops, landing one after another around the head. */
export function drops(): Drop[] {
  const rand = rng(404);
  const out: Drop[] = [];
  const count = 7;
  for (let i = 0; i < count; i += 1) {
    const a = rand() * Math.PI * 2;
    const d = 120 + rand() * 180;
    const r = 13 + rand() * 20;
    out.push({
      at: { x: 600 + Math.cos(a) * d * 1.2, y: 440 + Math.sin(a) * d },
      r,
      when: T.drops[0] + (i / count) * (T.drops[1] - T.drops[0]),
      edge: Array.from({ length: 24 }, () => 0.82 + rand() * 0.32),
      splats: Array.from({ length: 6 + Math.floor(rand() * 5) }, () => ({
        a: rand() * Math.PI * 2,
        d: 1.4 + rand() * 1.4,
        r: 1.5 + rand() * 3.5,
      })),
    });
  }
  return out;
}

/* ------------------------------------------------------------------ *
 * Scene 4 — the bridge
 * ------------------------------------------------------------------ */

/*
  A suspension bridge, because it is the structure that most plainly turns a
  load into geometry: the main cable between the towers hangs in a parabola,
  the shape a cable takes when the weight on it is spread evenly along the
  deck. `cableY` is that parabola, written out.
*/
const DECK = 560;
const TOWER_L = 380;
const TOWER_R = 820;
const TOWER_TOP = 300;
const SAG = 540;
const LEFT_END = 110;
const RIGHT_END = 1090;

/** Height of the main cable at `x` between the towers. */
export const cableY = (x: number) =>
  SAG + (TOWER_TOP - SAG) * ((x - 600) / ((TOWER_R - TOWER_L) / 2)) ** 2;

/** A side span: tower top to the anchorage, sagging slightly below the chord. */
function sideCable(fromX: number, toX: number): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i <= 24; i += 1) {
    const u = i / 24;
    out.push({
      x: fromX + (toX - fromX) * u,
      y: TOWER_TOP + (DECK - TOWER_TOP) * u + Math.sin(Math.PI * u) * 22,
    });
  }
  return out;
}

export type BridgePart = { id: string; pts: Pt[]; from: number; to: number; weight: number; structural: boolean };

export function bridge(): BridgePart[] {
  const [a, b] = T.clean;
  const k = (u: number) => a + (b - a) * u;
  const parts: BridgePart[] = [];
  const add = (id: string, pts: Pt[], from: number, to: number, weight = 1, structural = false) =>
    parts.push({ id, pts, from: k(from), to: k(to), weight, structural });

  add('deck', line({ x: LEFT_END, y: DECK }, { x: RIGHT_END, y: DECK }, 60), 0.05, 0.3, 1.4, true);
  add('deck-under', line({ x: LEFT_END, y: DECK + 14 }, { x: RIGHT_END, y: DECK + 14 }, 60), 0.1, 0.34, 1);

  // The truss between the deck's two chords: a Warren zigzag.
  const truss: Pt[] = [];
  for (let x = LEFT_END, i = 0; x <= RIGHT_END; x += 28, i += 1) truss.push({ x, y: i % 2 ? DECK + 14 : DECK });
  add('truss', truss, 0.18, 0.46, 0.7);

  for (const [i, x] of [TOWER_L, TOWER_R].entries()) {
    const d = i * 0.04;
    add(`tower-${i}-a`, line({ x: x - 9, y: DECK + 26 }, { x: x - 9, y: TOWER_TOP - 6 }), 0.12 + d, 0.36 + d, 1.5, true);
    add(`tower-${i}-b`, line({ x: x + 9, y: DECK + 26 }, { x: x + 9, y: TOWER_TOP - 6 }), 0.14 + d, 0.38 + d, 1.5, true);
    for (const y of [TOWER_TOP + 30, TOWER_TOP + 130]) {
      add(`tower-${i}-beam-${y}`, line({ x: x - 9, y }, { x: x + 9, y }, 4), 0.34 + d, 0.4 + d, 1.2);
    }
    // The pier the tower stands on, down into the water.
    add(`pier-${i}`, [
      { x: x - 24, y: DECK + 26 },
      { x: x + 24, y: DECK + 26 },
      { x: x + 20, y: DECK + 108 },
      { x: x - 20, y: DECK + 108 },
      { x: x - 24, y: DECK + 26 },
    ], 0.3 + d, 0.44 + d, 1.1);
  }

  const main: Pt[] = [];
  for (let x = TOWER_L; x <= TOWER_R; x += 10) main.push({ x, y: cableY(x) });
  add('cable-main', main, 0.36, 0.62, 1.4, true);
  add('cable-left', sideCable(TOWER_L, LEFT_END), 0.4, 0.6, 1.3, true);
  add('cable-right', sideCable(TOWER_R, RIGHT_END), 0.44, 0.64, 1.3, true);

  // Hangers: vertical ties from cable to deck, the load path made visible.
  let h = 0;
  for (let x = TOWER_L + 40; x < TOWER_R; x += 40, h += 1) {
    add(`hanger-${h}`, line({ x, y: cableY(x) }, { x, y: DECK }, 6), 0.6 + h * 0.018, 0.66 + h * 0.018, 0.7);
  }
  const side = (x: number, fromX: number, toX: number) => {
    const u = (x - fromX) / (toX - fromX);
    return TOWER_TOP + (DECK - TOWER_TOP) * u + Math.sin(Math.PI * u) * 22;
  };
  for (let x = 150; x < TOWER_L - 20; x += 44, h += 1) {
    add(`hanger-${h}`, line({ x, y: side(x, TOWER_L, LEFT_END) }, { x, y: DECK }, 6), 0.66 + h * 0.01, 0.72 + h * 0.01, 0.6);
  }
  for (let x = TOWER_R + 44; x < RIGHT_END - 20; x += 44, h += 1) {
    add(`hanger-${h}`, line({ x, y: side(x, TOWER_R, RIGHT_END) }, { x, y: DECK }, 6), 0.66 + h * 0.01, 0.72 + h * 0.01, 0.6);
  }

  // Water: short level strokes, hatched.
  const rand = rng(99);
  for (let i = 0; i < 16; i += 1) {
    const y = 676 + (i % 4) * 16 + rand() * 6;
    const x = 80 + rand() * 1000;
    add(`water-${i}`, line({ x, y }, { x: x + 40 + rand() * 90, y: y + (rand() - 0.5) * 2 }, 6), 0.78 + i * 0.008, 0.86 + i * 0.008, 0.6);
  }

  // A dimension line under the main span, as on a drawing.
  const dim = DECK + 190;
  add('dim', line({ x: TOWER_L, y: dim }, { x: TOWER_R, y: dim }, 20), 0.86, 0.96, 0.6);
  add('dim-l', line({ x: TOWER_L, y: dim - 10 }, { x: TOWER_L, y: dim + 10 }, 2), 0.9, 0.94, 0.6);
  add('dim-r', line({ x: TOWER_R, y: dim - 10 }, { x: TOWER_R, y: dim + 10 }, 2), 0.92, 0.96, 0.6);

  return parts;
}

/** The sun the watercolour wash puts behind the right tower. */
export const SUN = { x: 902, y: 318, r: 66 } as const;

/** Particle count for the break-up and the reassembly. */
export const PARTICLES = 520;
