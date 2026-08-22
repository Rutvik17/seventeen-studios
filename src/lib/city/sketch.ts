/**
 * THE PEN — hand-drawn strokes and washes, on a canvas.
 *
 * ==================================================================
 * THE JITTER MUST NOT BE RANDOM
 * ==================================================================
 *
 * The single thing that decides whether a sketched scene looks drawn or looks
 * broken: a wobble computed fresh each frame **boils**. Every line crawls, the
 * whole image simmers, and it reads as a rendering fault rather than as a hand.
 *
 * So no stroke ever calls `Math.random()`. Every offset comes from a hash of
 * what is being drawn — this building, this edge, this vertex — so the same
 * edge wobbles the same way in every frame it appears in, and the drawing sits
 * still while the camera moves through it. It is the difference between a
 * drawing and a bad video signal, and it costs nothing.
 *
 * ==================================================================
 * WHAT MAKES A LINE LOOK LIKE INK
 * ==================================================================
 *
 * Four things, in order of how much they matter:
 *
 * **It is not straight.** A ruled line reads as machine output. Real strokes
 * bow slightly between their ends, so each segment is subdivided and the
 * interior points pushed perpendicular by a small seeded amount.
 *
 * **It overshoots at corners.** A pen carries past a junction before the hand
 * changes direction. Nothing gives away a computer-drawn box faster than four
 * corners that meet exactly.
 *
 * **It is drawn more than once.** An inked line is usually two passes that
 * nearly agree, which is where the doubled, searching quality comes from.
 * Near buildings get two passes, distant ones get one, and that is also the
 * cheapest place to save time.
 *
 * **It varies in weight.** Down-strokes are heavier. Approximated by weighting
 * near geometry more than far, which does double duty as an atmospheric cue.
 *
 * ==================================================================
 * WASHES GO OUTSIDE THE LINES
 * ==================================================================
 *
 * Watercolour does not respect the drawing. It pools, it runs past an edge on
 * one side and stops short on another, and the ink sits on top of it rather
 * than containing it. So a wash is filled from a polygon that is the shape's
 * outline pushed out by a seeded per-vertex amount — a few pixels, different at
 * every corner — and drawn *before* the ink.
 *
 * Getting that one relationship right is most of the difference between a
 * flat-shaded polygon and something that looks painted.
 */

/* ------------------------------------------------------------------ *
 * Stable noise
 * ------------------------------------------------------------------ */

/** Signed noise in [-1, 1] from three integers. Order-independent, stateless. */
export function noise(a: number, b: number, c = 0): number {
  let h = Math.imul(a | 0, 0x27d4eb2d) ^ Math.imul(b | 0, 0x165667b1) ^ Math.imul(c | 0, 0x9e3779b9);
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return (((h ^ (h >>> 16)) >>> 0) / 2147483648) - 1;
}

export type P2 = { x: number; y: number };

/* ------------------------------------------------------------------ *
 * Strokes
 * ------------------------------------------------------------------ */

export type InkOptions = {
  /** Identifies this stroke, so its wobble is stable. */
  seed: number;
  /** Peak perpendicular deviation, in pixels. */
  wobble?: number;
  /** How far a stroke runs past its corners, in pixels. */
  overshoot?: number;
  /** How many times to draw it. */
  passes?: number;
  /** Close the path back to the start. */
  close?: boolean;
};

/**
 * Lay a wobbled polyline into the current path.
 *
 * Subdivision is by *length*, not by a fixed count: a 400 px edge needs more
 * wobble points than a 12 px one, and using a fixed count makes short edges
 * look frantic and long ones look ruled.
 */
export function inkPath(
  ctx: CanvasRenderingContext2D,
  pts: P2[],
  options: InkOptions,
): void {
  if (pts.length < 2) return;
  const wobble = options.wobble ?? 1.1;
  const overshoot = options.overshoot ?? 0;
  const close = options.close ?? false;

  const list = close ? [...pts, pts[0]] : pts;
  ctx.beginPath();

  for (let i = 0; i < list.length - 1; i += 1) {
    const a = list[i];
    const b = list[i + 1];
    let dx = b.x - a.x;
    let dy = b.y - a.y;
    const len = Math.hypot(dx, dy);
    if (len < 0.01) continue;
    dx /= len;
    dy /= len;
    // Perpendicular, for pushing the interior points off the straight line.
    const nx = -dy;
    const ny = dx;

    // A pen carries past the corner before the hand turns.
    const back = i === 0 && !close ? overshoot : 0;
    const fore = i === list.length - 2 && !close ? overshoot : 0;

    const steps = Math.max(1, Math.min(9, Math.round(len / 34)));
    const x0 = a.x - dx * back;
    const y0 = a.y - dy * back;
    if (i === 0) ctx.moveTo(x0, y0);

    for (let s = 1; s <= steps; s += 1) {
      const t = s / steps;
      const ex = t === 1 ? fore : 0;
      const px = a.x + dx * (len * t + ex);
      const py = a.y + dy * (len * t + ex);
      // Zero at both ends so the stroke still meets its corners; largest in the
      // middle, which is where a hand actually bows.
      const bow = Math.sin(t * Math.PI);
      const n = noise(options.seed, i * 31 + s, 7) * wobble * bow;
      ctx.lineTo(px + nx * n, py + ny * n);
    }
  }
  if (close) ctx.closePath();
}

/**
 * Draw a wobbled polyline, once or twice.
 *
 * The second pass uses a different salt, so the two lines nearly agree without
 * agreeing — which is the whole effect. Drawing the same path twice would just
 * make it darker.
 */
export function stroke(
  ctx: CanvasRenderingContext2D,
  pts: P2[],
  options: InkOptions & { colour: string; width: number },
): void {
  const passes = options.passes ?? 1;
  ctx.strokeStyle = options.colour;
  ctx.lineWidth = options.width;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  for (let p = 0; p < passes; p += 1) {
    inkPath(ctx, pts, { ...options, seed: options.seed + p * 9176 });
    // The second pass is lighter — it is a correction, not a repeat.
    ctx.globalAlpha = p === 0 ? 1 : 0.42;
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

/**
 * A watercolour wash: the shape, pushed out unevenly, filled under the ink.
 *
 * The outward push is per-vertex and seeded, so one corner floods and the next
 * stops short — which is what pigment does and what a uniform outline never
 * looks like.
 */
export function wash(
  ctx: CanvasRenderingContext2D,
  pts: P2[],
  colour: string,
  seed: number,
  bleed = 2.2,
): void {
  if (pts.length < 3) return;

  let cx = 0;
  let cy = 0;
  for (const p of pts) {
    cx += p.x;
    cy += p.y;
  }
  cx /= pts.length;
  cy /= pts.length;

  ctx.beginPath();
  for (let i = 0; i < pts.length; i += 1) {
    const p = pts[i];
    let dx = p.x - cx;
    let dy = p.y - cy;
    const len = Math.hypot(dx, dy) || 1;
    dx /= len;
    dy /= len;
    // Some corners flood outward, some pull back inside the line.
    const push = bleed * (0.35 + noise(seed, i, 3) * 0.9);
    const x = p.x + dx * push;
    const y = p.y + dy * push;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fillStyle = colour;
  ctx.fill();
}

/** A plain fill, for anything too small or too far for a wash to read. */
export function flat(ctx: CanvasRenderingContext2D, pts: P2[], colour: string): void {
  if (pts.length < 3) return;
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i += 1) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.closePath();
  ctx.fillStyle = colour;
  ctx.fill();
}

/**
 * Cross-hatching inside a quad, the way a pen shades a face in shadow.
 *
 * Angled at roughly 60° so it never lines up with the building edges — hatching
 * parallel to an edge reads as a mistake, and hatching perpendicular reads as
 * corrugated metal.
 */
export function hatch(
  ctx: CanvasRenderingContext2D,
  pts: P2[],
  colour: string,
  seed: number,
  spacing = 6,
  alpha = 0.16,
): void {
  if (pts.length < 3 || spacing < 2) return;
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const p of pts) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }
  const w = maxX - minX;
  const h = maxY - minY;
  if (w < 3 || h < 3 || w > 4000 || h > 4000) return;

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i += 1) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.closePath();
  ctx.clip();

  ctx.globalAlpha = alpha;
  ctx.strokeStyle = colour;
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  const span = w + h;
  for (let i = 0; i * spacing < span; i += 1) {
    const o = i * spacing + noise(seed, i, 11) * spacing * 0.3;
    ctx.moveTo(minX + o, minY - 2);
    ctx.lineTo(minX + o - h * 0.58, maxY + 2);
  }
  ctx.stroke();
  ctx.restore();
  ctx.globalAlpha = 1;
}

/* ------------------------------------------------------------------ *
 * Palette
 * ------------------------------------------------------------------ */

export type Palette = {
  name: 'day' | 'golden' | 'dusk' | 'night';
  /** Sky, top to horizon. */
  skyTop: string;
  skyBottom: string;
  /** Water. */
  water: string;
  waterHighlight: string;
  /** Ink, near and far. Distance desaturates and lightens — haze. */
  ink: string;
  inkFar: string;
  /** Facades by district tone. */
  warm: string;
  cool: string;
  brick: string;
  pale: string;
  /** Parkland. */
  green: string;
  greenDeep: string;
  /** The ground the city stands on. Never a facade tone — they must differ. */
  ground: string;
  /** Roadway. */
  asphalt: string;
  /** Lit windows, and how many are lit. */
  window: string;
  windowLit: number;
  /** Accent, for taxis and signage. */
  cab: string;
  /** How strongly distance washes things out. */
  haze: number;
  hazeColour: string;
};

const DAY: Palette = {
  name: 'day',
  skyTop: '#bcd8ea',
  skyBottom: '#eaf1f4',
  water: '#8fb4cc',
  waterHighlight: '#cfe2ec',
  ink: '#2a2f3a',
  inkFar: '#8792a4',
  warm: '#f0e2cc',
  cool: '#dfe6ee',
  brick: '#cfa08e',
  pale: '#eeeae2',
  green: '#a9c68d',
  greenDeep: '#7ba063',
  ground: '#d5d2c8',
  asphalt: '#b3b1ab',
  window: '#8ba6bd',
  windowLit: 0.06,
  cab: '#f2b526',
  haze: 0.62,
  hazeColour: '#dce8f0',
};

const GOLDEN: Palette = {
  name: 'golden',
  skyTop: '#8fb6d6',
  skyBottom: '#fbdcb0',
  water: '#7d94ad',
  waterHighlight: '#f4d9ab',
  ink: '#37302f',
  inkFar: '#a08b7e',
  warm: '#f7dcae',
  cool: '#e6d5cb',
  brick: '#d2a184',
  pale: '#f6e6cd',
  green: '#b3bf78',
  greenDeep: '#7f9553',
  ground: '#ddceb8',
  asphalt: '#b6a794',
  window: '#e0aa5c',
  windowLit: 0.22,
  cab: '#ffbe2b',
  haze: 0.66,
  hazeColour: '#f6dcb6',
};

const DUSK: Palette = {
  name: 'dusk',
  skyTop: '#41537f',
  skyBottom: '#e09679',
  water: '#4a5776',
  waterHighlight: '#8f96b4',
  ink: '#20222f',
  inkFar: '#5c6483',
  warm: '#8d8399',
  cool: '#7a839f',
  brick: '#8a6d79',
  pale: '#9a99ab',
  green: '#5f7566',
  greenDeep: '#42553f',
  ground: '#6a6d7e',
  asphalt: '#4c4f5e',
  window: '#ffd88a',
  windowLit: 0.44,
  cab: '#ffc93c',
  haze: 0.58,
  hazeColour: '#5a6486',
};

const NIGHT: Palette = {
  name: 'night',
  skyTop: '#101728',
  skyBottom: '#2b3352',
  water: '#151d33',
  waterHighlight: '#38456b',
  ink: '#0c1020',
  inkFar: '#39415e',
  warm: '#2f3348',
  cool: '#282f47',
  brick: '#33293a',
  pale: '#343a52',
  green: '#22301f',
  greenDeep: '#18220f',
  ground: '#252a3c',
  asphalt: '#191d2b',
  window: '#ffdf9c',
  windowLit: 0.58,
  cab: '#ffcc33',
  haze: 0.5,
  hazeColour: '#1d2540',
};

/**
 * Which palette the city is in, from the viewer's own clock.
 *
 * Their local hour, not a server's — the point is that the drawing agrees with
 * the window next to it. Dusk gets the narrow bands either side of sunrise and
 * sunset because that is when it actually happens, and it is the best-looking
 * hour of the four, so it is worth not widening out of greed.
 */
export function paletteForHour(hour: number): Palette {
  if (hour >= 21 || hour < 5) return NIGHT;
  if (hour < 7 || hour >= 19.5) return DUSK;
  if (hour >= 17) return GOLDEN;
  return DAY;
}

export const PALETTES = { DAY, GOLDEN, DUSK, NIGHT };

/**
 * Fade a colour toward the haze at distance.
 *
 * Aerial perspective: the further something is, the more air is between you and
 * it, and the more the air's own colour is mixed in. It is why distant hills are
 * blue, and it is the strongest depth cue a flat drawing has after convergence
 * — far stronger than making things smaller, which perspective already does.
 *
 * `strength` is how much of the haze is mixed in, from 0 at the lens to 1 at the
 * far distance.
 */
export function hazed(colour: string, palette: Palette, strength: number): string {
  const t = Math.max(0, Math.min(1, strength)) * palette.haze;
  if (t < 0.01) return colour;
  const a = parseHex(colour);
  const b = parseHex(palette.hazeColour);
  if (!a || !b) return colour;
  const m = (i: number) => Math.round(a[i] + (b[i] - a[i]) * t);
  return `rgb(${m(0)},${m(1)},${m(2)})`;
}

function parseHex(c: string): [number, number, number] | null {
  if (c[0] !== '#') return null;
  const h = c.length >= 7 ? c.slice(1, 7) : c.slice(1, 4).split('').map((d) => d + d).join('');
  const n = parseInt(h, 16);
  if (Number.isNaN(n)) return null;
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/**
 * How hazed something at this depth should be.
 *
 * Exponential, the way extinction actually works — light lost over a path is
 * `1 − e^(−d/D)`, not a linear ramp. The linear version has a visible end where
 * the fog stops, and the exponential one never does.
 */
export function hazeAt(depth: number, scale = 9000): number {
  return 1 - Math.exp(-Math.max(0, depth) / scale);
}
