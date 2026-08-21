/**
 * The world's geometry — ridgelines, the gate, the chime rig.
 *
 * Pure functions over a seed, and that is the important property: the same seed
 * gives byte-identical path data every time, so the server's HTML and the
 * client's first render agree and React never reports a hydration mismatch.
 * `Math.random()` here would produce a different mountain on the server than in
 * the browser, and React would throw the server's markup away and re-render the
 * whole scene — the one bug that would make this section slower than a video.
 *
 * Everything is authored in a 1600 × 900 viewBox and scaled by the SVG.
 */

export const SCENE_W = 1600;
export const SCENE_H = 900;

/* ------------------------------------------------------------------ *
 * Deterministic noise
 * ------------------------------------------------------------------ */

/** Mulberry32 — small, fast, and good enough for terrain. */
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * 1D value noise with cosine interpolation.
 *
 * Cosine rather than linear because a ridgeline built on linear interpolation
 * has a visible corner at every lattice point, and at these amplitudes the eye
 * reads those corners as a zigzag rather than as hills.
 */
function valueNoise(seed: number, points: number): (t: number) => number {
  const random = rng(seed);
  const lattice = Array.from({ length: points + 1 }, () => random());
  return (t: number) => {
    const x = t * points;
    const i = Math.floor(x);
    const f = x - i;
    const a = lattice[i % points];
    const b = lattice[(i + 1) % points];
    const s = (1 - Math.cos(f * Math.PI)) / 2;
    return a + (b - a) * s;
  };
}

/** Two octaves is enough for a silhouette; more just costs path length. */
function ridgeHeight(seed: number): (t: number) => number {
  const coarse = valueNoise(seed, 5);
  const fine = valueNoise(seed + 977, 13);
  return (t: number) => coarse(t) * 0.76 + fine(t) * 0.24;
}

/* ------------------------------------------------------------------ *
 * Ridges
 * ------------------------------------------------------------------ */

export type RidgeSpec = {
  seed: number;
  /** Baseline, as a fraction of scene height. */
  base: number;
  /** Peak travel above the baseline, as a fraction of scene height. */
  amplitude: number;
};

/**
 * A closed ridgeline path.
 *
 * Extended well past both edges: the layers are parallaxed horizontally, and a
 * path that stopped at the viewBox would slide its own end into frame. Cheaper
 * to draw wide once than to clamp the movement.
 */
export function ridgePath({ seed, base, amplitude }: RidgeSpec): string {
  const height = ridgeHeight(seed);
  const steps = 72;
  const overscan = SCENE_W * 0.18;
  const left = -overscan;
  const right = SCENE_W + overscan;
  const span = right - left;

  let d = `M ${left} ${SCENE_H + 40}`;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = left + t * span;
    const y = SCENE_H * base - height(t) * SCENE_H * amplitude;
    d += ` L ${round(x)} ${round(y)}`;
  }
  d += ` L ${right} ${SCENE_H + 40} Z`;
  return d;
}

/** Far to near. Each is parallaxed by its index in `WorldHero`. */
export const RIDGES: RidgeSpec[] = [
  { seed: 3, base: 0.72, amplitude: 0.2 },
  { seed: 17, base: 0.79, amplitude: 0.17 },
  { seed: 41, base: 0.87, amplitude: 0.14 },
  { seed: 89, base: 0.96, amplitude: 0.11 },
];

/* ------------------------------------------------------------------ *
 * The gate
 * ------------------------------------------------------------------ */

export type ToriiParts = {
  kasagi: string;
  nuki: string;
  pillarLeft: string;
  pillarRight: string;
};

/**
 * A torii, as four paths so each can be revealed separately on scroll.
 *
 * Proportioned off a real one rather than eyeballed: the pillars lean inward
 * (`batter`) by about 2% of their height, and the top lintel oversails the
 * pillars and curves up at the ends. Both details are why a torii reads as a
 * torii instead of as the Greek letter pi — a straight, flush version looks
 * wrong to everyone and almost nobody can say why.
 */
export function torii(cx: number, baseY: number, height: number): ToriiParts {
  const w = height * 0.86;
  const half = w / 2;
  const batter = height * 0.02;
  const pillar = height * 0.062;

  const topY = baseY - height;
  const nukiY = baseY - height * 0.76;
  const oversail = half * 0.3;

  const leftTop = cx - half + batter;
  const rightTop = cx + half - batter;

  return {
    // Curved lintel: a shallow arc, thicker at the middle, tipped up at both
    // ends. Drawn as one closed path so it can carry a single fill.
    kasagi: [
      `M ${round(cx - half - oversail)} ${round(topY + height * 0.03)}`,
      `Q ${round(cx)} ${round(topY - height * 0.035)} ${round(cx + half + oversail)} ${round(topY + height * 0.03)}`,
      `L ${round(cx + half + oversail)} ${round(topY + height * 0.075)}`,
      `Q ${round(cx)} ${round(topY + height * 0.012)} ${round(cx - half - oversail)} ${round(topY + height * 0.075)}`,
      'Z',
    ].join(' '),
    nuki: [
      `M ${round(cx - half - oversail * 0.34)} ${round(nukiY)}`,
      `L ${round(cx + half + oversail * 0.34)} ${round(nukiY)}`,
      `L ${round(cx + half + oversail * 0.34)} ${round(nukiY + height * 0.045)}`,
      `L ${round(cx - half - oversail * 0.34)} ${round(nukiY + height * 0.045)}`,
      'Z',
    ].join(' '),
    pillarLeft: pillarPath(leftTop, cx - half, topY + height * 0.05, baseY, pillar),
    pillarRight: pillarPath(rightTop, cx + half, topY + height * 0.05, baseY, pillar),
  };
}

function pillarPath(
  topX: number,
  bottomX: number,
  topY: number,
  bottomY: number,
  width: number,
): string {
  const half = width / 2;
  return [
    `M ${round(topX - half)} ${round(topY)}`,
    `L ${round(topX + half)} ${round(topY)}`,
    `L ${round(bottomX + half * 1.16)} ${round(bottomY)}`,
    `L ${round(bottomX - half * 1.16)} ${round(bottomY)}`,
    'Z',
  ].join(' ');
}

/* ------------------------------------------------------------------ *
 * Chimes
 * ------------------------------------------------------------------ */

export type ChimeSpec = {
  id: string;
  /** Pivot, in scene units. */
  x: number;
  y: number;
  /** Bell radius. */
  r: number;
  /** Cord length from pivot to bell. */
  cord: number;
  /** Physical length in metres, for the pendulum. Shorter swings faster. */
  length: number;
  /** Starting phase, so they do not all hang dead straight. */
  phase: number;
};

/**
 * Six furin on a beam.
 *
 * The lengths are deliberately unequal and not in a simple ratio. A pendulum's
 * period goes as √L, so equal lengths would swing in lockstep and read as one
 * rigid object rotating; unequal ones drift in and out of phase forever, which
 * is what a row of real chimes does and why it never stops being interesting.
 */
export const CHIMES: ChimeSpec[] = [
  { id: 'c1', x: 176, y: -6, r: 17, cord: 92, length: 0.3, phase: 0.16 },
  { id: 'c2', x: 292, y: -6, r: 14, cord: 132, length: 0.44, phase: -0.1 },
  { id: 'c3', x: 404, y: -6, r: 19, cord: 74, length: 0.25, phase: 0.24 },
  { id: 'c4', x: 1204, y: -6, r: 15, cord: 116, length: 0.39, phase: -0.19 },
  { id: 'c5', x: 1318, y: -6, r: 18, cord: 86, length: 0.28, phase: 0.12 },
  { id: 'c6', x: 1428, y: -6, r: 13, cord: 142, length: 0.47, phase: -0.22 },
];

/* ------------------------------------------------------------------ *
 * Lanterns
 * ------------------------------------------------------------------ */

export type LanternSpec = {
  id: string;
  x: number;
  y: number;
  scale: number;
  /** Seconds per drift cycle. Unequal, for the same reason as the chimes. */
  period: number;
  phase: number;
};

export const LANTERNS: LanternSpec[] = [
  { id: 'l1', x: 232, y: 452, scale: 1, period: 7.4, phase: 0 },
  { id: 'l2', x: 1382, y: 388, scale: 0.78, period: 9.1, phase: 2.1 },
  { id: 'l3', x: 1150, y: 520, scale: 0.6, period: 11.3, phase: 4.4 },
  { id: 'l4', x: 452, y: 566, scale: 0.52, period: 8.6, phase: 1.2 },
];

function round(n: number): number {
  return Math.round(n * 10) / 10;
}
