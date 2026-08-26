/**
 * WHAT THE COMPANION STANDS IN FRONT OF.
 *
 * Fuji. A torii on the near ridge, mist along the valley, blossom on the wind —
 * and the light on it moves with the model's reading: first light when it is
 * confident, moonlit when it is calm, overcast and then storm as that falls
 * away.
 *
 * The SCENE never changes, only the hour. That is the distinction worth
 * keeping: the panel already carries the model twice, in which character stands
 * there and what pose they hold, and a backdrop that redrew itself into a
 * different subject would be a third voice repeating them. A place at dawn and
 * the same place at midnight is not new information — it is the same place, and
 * that is exactly what makes it legible from across a desk.
 *
 * ---
 * WHY SUNRISE, WHICH IS A LEGIBILITY DECISION
 *
 * The sprite pack is dark, cool and heavily outlined, so it needs a BRIGHT
 * HORIZON to read against — put a dark character on a dark night sky and the
 * silhouette that makes pixel art readable simply stops working.
 *
 * Everything above the horizon is therefore in shadow and everything at it is
 * lit, which is also just what dawn looks like. The character stands against
 * the brightest band in the frame at exactly the height their body occupies.
 *
 * It suits the panel, too. An OLED pixel that is off draws NOTHING, so a scene
 * that is mostly dark silhouette costs almost no current — where a full-bleed
 * daylight sky would light all 16,384 pixels at once.
 *
 * ---
 * WHY THE MOUNTAIN IS A FORMULA AND THE REST IS DRAWN
 *
 * Fuji is a stratovolcano, and its profile is close to `|x|^1.4` — concave
 * flanks that flare out at the base, not the straight-sided triangle every
 * clip-art version uses. That exponent is the difference between "a mountain"
 * and "Fuji", so it is computed.
 *
 * The ridges either side are authored by hand. Procedural terrain was tried on
 * this panel and looked like exactly what it was: noise with a horizon.
 */

/** The panel, and the sprite frames, are both this. */
export const PANEL = 128;

import type { Animation } from '@/lib/sprites';

export type Scene = {
  /** Zenith to horizon, four stops. */
  sky: [string, string, string, string];
  /** What is in the sky, if anything is visible at all. */
  body: { kind: 'sun' | 'moon'; fill: string; glow: string } | null;
  fuji: string;
  fujiSnow: string;
  ridgeMid: string;
  ridgeNear: string;
  ground: string;
  torii: string;
  mist: string;
  /** How many stars survive this sky. Overcast keeps none. */
  stars: number;
  petals: number;
};

/*
  Six hours of the same mountain.

  Deliberately NOT six tints of one picture. Dawn is warm and low contrast, the
  moonlit sky is cold and clear, the storm is nearly monochrome with a bruised
  horizon. If they differed only in hue the panel would be showing decoration
  rather than a time of day.

  Every one keeps a BRIGHT BAND AT THE HORIZON, and that is a legibility
  requirement rather than a stylistic habit: the sprite pack is dark and heavily
  outlined, so it needs something light directly behind the height the body
  occupies. A uniformly dark sky would swallow the silhouette that makes pixel
  art readable at all.

  Keyed by ANIMATION rather than by the percentile directly, so the hour and the
  pose come from a single call to `animationFor`. Reading the thresholds twice
  is how a panel ends up showing a victory pose against a storm.
*/
const SCENES: Record<Animation, Scene> = {
  // Conviction, on the offensive. First light behind the mountain.
  Attack_1: {
    sky: ['#241546', '#5b3168', '#b8566a', '#ffd9a0'],
    body: { kind: 'sun', fill: '#fff4d6', glow: '#ffb877' },
    fuji: '#6d4470',
    fujiSnow: '#e8cfc8',
    ridgeMid: '#3a2350',
    ridgeNear: '#1c1230',
    ground: '#0e0819',
    torii: '#160c1f',
    mist: '#ffd2b4',
    stars: 6,
    petals: 8,
  },
  // Running. Clear, cold, moonlit — moving rather than triumphant.
  Run: {
    sky: ['#070f26', '#153053', '#2f6285', '#9fd0dc'],
    body: { kind: 'moon', fill: '#f4faff', glow: '#8fc4e0' },
    fuji: '#2c4a6b',
    fujiSnow: '#d8e6f2',
    ridgeMid: '#1a2f47',
    ridgeNear: '#0d1a2b',
    ground: '#060c15',
    torii: '#0a1420',
    mist: '#bcd9e8',
    stars: 26,
    petals: 6,
  },
  // Walking. Dusk: neither one thing nor the other, which is the point.
  Walk: {
    sky: ['#141a2e', '#2d3550', '#5a5570', '#c2a68f'],
    body: { kind: 'moon', fill: '#e6ebf5', glow: '#8b8fa8' },
    fuji: '#413f5c',
    fujiSnow: '#cdcfdc',
    ridgeMid: '#26263c',
    ridgeNear: '#141527',
    ground: '#0a0a14',
    stars: 12,
    torii: '#100f1c',
    mist: '#b9aeb0',
    petals: 4,
  },
  // Guarded. Overcast — the moon is up there and you cannot see it.
  Shield: {
    sky: ['#1a1d26', '#31353f', '#5c606a', '#b6b2ad'],
    body: null,
    fuji: '#3a3b46',
    fujiSnow: '#b8b7bd',
    ridgeMid: '#24262e',
    ridgeNear: '#14151a',
    ground: '#0b0b0f',
    torii: '#0f1014',
    mist: '#9a9694',
    stars: 0,
    petals: 2,
  },
  // Hurt. Storm: almost monochrome, horizon bruised.
  Hurt: {
    sky: ['#100b12', '#2a1822', '#5c2530', '#c05a45'],
    body: null,
    fuji: '#2e1c26',
    fujiSnow: '#8f7c82',
    ridgeMid: '#1c1017',
    ridgeNear: '#0f080c',
    ground: '#070406',
    torii: '#0a0508',
    mist: '#6b3a38',
    stars: 0,
    petals: 0,
  },
  // At rest. A clear night, quiet and unhurried.
  Idle: {
    sky: ['#0a1024', '#1b2b47', '#3f5a72', '#b9c9c8'],
    body: { kind: 'moon', fill: '#eef5ff', glow: '#7fa2c0' },
    fuji: '#33445e',
    fujiSnow: '#d2dfec',
    ridgeMid: '#1e2b3e',
    ridgeNear: '#101827',
    ground: '#080c14',
    torii: '#0c121c',
    mist: '#a9c0cc',
    stars: 22,
    petals: 5,
  },
  // Down. Deep night, almost nothing lit.
  Dead: {
    sky: ['#03050c', '#0a1120', '#152540', '#41627f'],
    body: { kind: 'moon', fill: '#cfdcee', glow: '#3b5573' },
    fuji: '#131f30',
    fujiSnow: '#8497ad',
    ridgeMid: '#0c1420',
    ridgeNear: '#070c14',
    ground: '#03050a',
    torii: '#05080e',
    mist: '#2a3c50',
    stars: 30,
    petals: 0,
  },
};

export function sceneFor(animation: Animation): Scene {
  return SCENES[animation] ?? SCENES.Walk;
}

export const PALETTE = { star: '#ffeed4', petal: '#ffc2c8' } as const;

/*
  Fuji.

  Base wider than it looks it should be — the mountain is 3,776 m over a 40 km
  spread, so the flanks reach much further out than a drawn triangle ever does.
  The peak sits left of centre so the composition is not a bullseye, and the
  character stands to the left of it.
*/
export const FUJI = {
  cx: 62,
  peakY: 38,
  baseY: 98,
  /*
    Wide. Fuji is 3,776 m over a base roughly 40 km across, so the honest ratio
    is about 1:10 and anything approaching a drawn triangle is far too steep.
    Even at 74 this is a compression — but the earlier 54 read as a hill.
  */
  halfWidth: 74,
  /** Concave flanks. 1.0 would be a triangle; a stratovolcano is not one. */
  exponent: 1.42,
  /** The summit is a crater rim, not a point. */
  craterHalf: 5,
} as const;

/** Height of the cone at a given column, or null beyond its base. */
function fujiY(x: number): number | null {
  const dx = Math.abs(x - FUJI.cx);
  if (dx > FUJI.halfWidth) return null;
  if (dx <= FUJI.craterHalf) return FUJI.peakY;

  const t = (dx - FUJI.craterHalf) / (FUJI.halfWidth - FUJI.craterHalf);
  return FUJI.peakY + (FUJI.baseY - FUJI.peakY) * Math.pow(t, FUJI.exponent);
}

/**
 * The mountain as an SVG path, stepped to whole pixels.
 *
 * The steps matter. A smooth curve behind pixel art reads as a mistake — the
 * two live on different grids and the eye catches it instantly. Rounding every
 * vertex to the panel's own pixels is what makes the backdrop belong to the
 * same picture as the sprite standing on it.
 */
export function fujiPath(): string {
  const parts: string[] = [];
  let previous: number | null = null;

  for (let x = 0; x <= PANEL; x++) {
    const y = fujiY(x);
    if (y === null) continue;
    const stepped = Math.round(y);

    if (previous === null) parts.push(`M ${x} ${FUJI.baseY}`, `L ${x} ${stepped}`);
    else parts.push(`L ${x} ${previous}`, `L ${x} ${stepped}`);
    previous = stepped;
  }

  const right = FUJI.cx + FUJI.halfWidth;
  parts.push(`L ${right} ${FUJI.baseY}`, 'Z');
  return parts.join(' ');
}

/**
 * The snow cap: the cone above the snow line, with a ragged lower edge.
 *
 * Snow does not stop at a contour. It runs further down the gullies than the
 * ridges, so a cap cut off flat is the tell that it was drawn by someone who
 * only ever saw a postcard.
 */
export function snowPath(): string {
  const line = FUJI.peakY + 13;
  const parts: string[] = [];
  let previous: number | null = null;

  for (let x = 0; x <= PANEL; x++) {
    const y = fujiY(x);
    if (y === null || y > line) continue;
    const stepped = Math.round(y);
    if (previous === null) parts.push(`M ${x} ${stepped}`);
    else parts.push(`L ${x} ${previous}`, `L ${x} ${stepped}`);
    previous = stepped;
  }

  // Come back along the snow line, dipping where the gullies are.
  const cols: number[] = [];
  for (let x = PANEL; x >= 0; x--) if (fujiY(x) !== null && fujiY(x)! <= line) cols.push(x);
  for (const x of cols) {
    const wobble = Math.round(Math.sin(x * 0.9) * 1.6 + Math.sin(x * 0.31) * 1.4);
    parts.push(`L ${x} ${line + wobble}`);
  }

  parts.push('Z');
  return parts.join(' ');
}

/*
  The ridges either side, as heights in pixels above their own horizon.

  Seventeen samples each, drawn to have a shape rather than a texture. The mid
  ridge answers Fuji from the left so the composition is not all weight on one
  side; the near ridge is low and calm because the character has to stand on it
  and a busy silhouette under their feet would read as clutter.
*/
export const RIDGE_MID = [14, 19, 24, 18, 12, 9, 7, 6, 5, 6, 8, 11, 9, 7, 10, 13, 9];
export const RIDGE_NEAR = [4, 6, 5, 7, 9, 7, 5, 6, 8, 7, 5, 6, 8, 6, 4, 5, 4];

/** Where each layer meets the sky, in panel pixels from the top. */
export const HORIZON = { mid: 99, near: 110 } as const;

export function ridgePath(profile: number[], baseY: number): string {
  const step = PANEL / (profile.length - 1);
  const parts: string[] = [`M 0 ${PANEL}`];

  let previous = Math.round(baseY - profile[0]);
  parts.push(`L 0 ${previous}`);

  for (let i = 1; i < profile.length; i++) {
    const x = Math.round(i * step);
    const y = Math.round(baseY - profile[i]);
    parts.push(`L ${x} ${previous}`, `L ${x} ${y}`);
    previous = y;
  }

  parts.push(`L ${PANEL} ${previous}`, `L ${PANEL} ${PANEL}`, 'Z');
  return parts.join(' ');
}

/*
  A torii, in whole pixels.

  The proportions are the ones that make it read as a gate rather than as the
  letter H: the top rail (kasagi) overhangs the posts on both sides and is the
  heaviest element, the second rail (nuki) sits close beneath it, and the posts
  lean very slightly inward. Miss the overhang and it stops being a torii.
*/
export const TORII = { x: 14, y: 92, w: 22, h: 18 } as const;

export function toriiParts() {
  const { x, y, w, h } = TORII;
  return [
    { x: x - 2, y, w: w + 4, h: 2 },          // kasagi, overhanging
    { x: x - 1, y: y + 2, w: w + 2, h: 1 },   // shimaki
    { x: x + 1, y: y + 6, w: w - 2, h: 2 },   // nuki
    { x: x + 1, y: y + 2, w: 3, h: h - 2 },   // left post
    { x: x + w - 4, y: y + 2, w: 3, h: h - 2 }, // right post
  ];
}

/** A deterministic scatter, so nothing reshuffles between renders. */
function scatter(count: number, seedA: number, seedB: number) {
  const out: Array<{ x: number; y: number; i: number }> = [];
  for (let i = 0; i < count; i++) {
    const a = Math.sin((i + 1) * seedA) * 43758.5453;
    const b = Math.sin((i + 1) * seedB) * 24634.6345;
    out.push({ x: (a - Math.floor(a)) * PANEL, y: (b - Math.floor(b)) * PANEL, i });
  }
  return out;
}

/**
 * Stars, fading as they near the horizon — at dawn the sky washes them out from
 * the bottom up, so a field of even brightness would read as midnight.
 *
 * Seeded rather than random: a constellation that reshuffles whenever React
 * re-renders reads as broken without anyone being able to say why.
 */
export function stars(count = 26) {
  return scatter(count, 127.1, 311.7)
    .map(({ x, y, i }) => {
      const py = Math.round(y * 0.42);
      return {
        x: Math.round(x),
        y: py,
        r: i % 6 === 0 ? 0.9 : 0.5,
        opacity: Math.max(0.12, 0.9 - py / 48),
        delay: (i * 0.37) % 4,
      };
    })
    .filter((s) => (fujiY(s.x) ?? PANEL) > s.y + 2);
}

/** Blossom drifting across, each petal on its own pace. */
export function petals(count = 8) {
  return scatter(count, 91.3, 57.9).map(({ x, y, i }) => ({
    x: Math.round(x),
    y: Math.round(20 + y * 0.6),
    drift: 11 + (i % 4) * 4,
    delay: (i * 1.7) % 11,
  }));
}

/** The sun, just clear of the ridge and behind the mountain's right flank. */
export const SUN = { cx: 104, cy: 80, r: 8 } as const;
