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
  /**
   * Facade colours. A building picks one by hash, biased by its district.
   *
   * A set, not a tone. One colour per district makes a city of grey boxes; New
   * York is terracotta beside limestone beside sage on the same block, because
   * the blocks were built by different people out of whatever was going.
   */
  facades: string[];
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

/**
 * THE PALETTES.
 *
 * ---
 *
 * WHY EVERY BUILDING GETS ITS OWN COLOUR
 *
 * A city painted in one tone per district reads as a rendering — grey boxes
 * with a grey ground, lit by a grey sun. New York is not grey. It is terracotta
 * and ochre and sage and dusty blue and the particular tired cream of a
 * pre-war limestone facade, all of it side by side on one block, because the
 * blocks were built by different people in different decades out of whatever
 * was going.
 *
 * So each palette carries a **set** of facade colours rather than one, and a
 * building picks from it by hash. Its district biases which end of the set it
 * draws from — the Village to the brick end, Midtown to the pale end — but
 * every district gets some of everything, which is what stops the boundaries
 * showing as bands.
 */

const DAY: Palette = {
  name: 'day',
  skyTop: '#8fc0e0',
  skyBottom: '#e8f0f2',
  water: '#7fa9c6',
  waterHighlight: '#cfe2ec',
  ink: '#2f2a33',
  inkFar: '#8b8496',
  facades: [
    '#f0dcc0', // limestone
    '#d98f6a', // terracotta
    '#c9633f', // brick red
    '#e8c46a', // ochre
    '#a8bda0', // sage
    '#8fb0c4', // dusty blue
    '#efe6d8', // cream
    '#b98a9a', // faded rose
    '#7fa9a2', // verdigris
    '#c9b48f', // sandstone
    '#e5e1d6', // pale
    '#9a8fae', // slate violet
  ],
  green: '#8fb972',
  greenDeep: '#5f8a4c',
  ground: '#cdc7bb',
  asphalt: '#a8a49d',
  window: '#6f93b0',
  windowLit: 0.07,
  cab: '#f5b120',
  haze: 0.6,
  hazeColour: '#d3e4ee',
};

const GOLDEN: Palette = {
  name: 'golden',
  skyTop: '#6f9fcc',
  skyBottom: '#fcd9a0',
  water: '#6b8ba8',
  waterHighlight: '#f4d9ab',
  ink: '#3a2c2c',
  inkFar: '#a08b7e',
  facades: [
    '#f8dcae',
    '#e59a63',
    '#d4693e',
    '#f2c05c',
    '#bcc487',
    '#95b0c0',
    '#fbeed4',
    '#cc8f8f',
    '#8fb0a4',
    '#dcb98a',
    '#f3e6cf',
    '#a892a8',
  ],
  green: '#a8be74',
  greenDeep: '#75904f',
  ground: '#d8c7ac',
  asphalt: '#ad9d8a',
  window: '#f0b45f',
  windowLit: 0.24,
  cab: '#ffbe2b',
  haze: 0.62,
  hazeColour: '#f6dcb6',
};

const DUSK: Palette = {
  name: 'dusk',
  skyTop: '#33436f',
  skyBottom: '#e0836a',
  water: '#3f4c6b',
  waterHighlight: '#8f96b4',
  ink: '#1d1f2c',
  inkFar: '#5c6483',
  facades: [
    '#8a7f8e',
    '#96695f',
    '#8c4f43',
    '#a08359',
    '#75846f',
    '#65788e',
    '#9b93a0',
    '#8a6674',
    '#5f8079',
    '#8b7a68',
    '#a09aa6',
    '#6e6480',
  ],
  green: '#4f6a55',
  greenDeep: '#37492f',
  ground: '#5f6274',
  asphalt: '#454857',
  window: '#ffd88a',
  windowLit: 0.46,
  cab: '#ffc93c',
  haze: 0.55,
  hazeColour: '#5a6486',
};

const NIGHT: Palette = {
  name: 'night',
  skyTop: '#0c1224',
  skyBottom: '#28304e',
  water: '#111a30',
  waterHighlight: '#38456b',
  ink: '#080b18',
  inkFar: '#333b58',
  facades: [
    '#2f3348',
    '#3a2e39',
    '#38252c',
    '#3a3348',
    '#2a3436',
    '#26304a',
    '#343a52',
    '#332a3c',
    '#243a3a',
    '#33302e',
    '#3a3c4e',
    '#2c2a42',
  ],
  green: '#1d2b1c',
  greenDeep: '#141d0e',
  ground: '#1f2436',
  asphalt: '#161a28',
  window: '#ffdf9c',
  windowLit: 0.6,
  cab: '#ffcc33',
  haze: 0.48,
  hazeColour: '#1a2340',
};

/**
 * Which palette the city is in, from the viewer's own clock.
 *
 * Their local hour, not a server's — the point is that the drawing agrees with
 * the window next to it. Dusk gets only the narrow bands either side of sunrise
 * and sunset because that is when it actually happens, and it is the best of
 * the four, so it is worth not widening out of greed.
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

/**
 * The facade colour for one building.
 *
 * The district shifts where in the set it lands rather than restricting it, so
 * the Village leans brick and Midtown leans limestone without either being
 * uniform — and, more importantly, without the boundary between them showing up
 * as a line across the city. A hard district-to-colour mapping draws exactly
 * that line, and from the air it looks like a political map.
 */
export function facadeFor(palette: Palette, seed: number, bias: number): string {
  const n = palette.facades.length;
  const i = (Math.abs(Math.round(seed)) + bias) % n;
  return palette.facades[i];
}

/** Where in the facade set each district sits. */
export const DISTRICT_BIAS: Record<string, number> = {
  midtown: 6,
  financial: 5,
  billionaires: 10,
  village: 1,
  harlem: 2,
  brooklyn: 1,
  queens: 3,
  bronx: 2,
  statenIsland: 4,
};

/* ------------------------------------------------------------------ *
 * Paper
 * ------------------------------------------------------------------ */

let paper: HTMLCanvasElement | null = null;
let paperKey = '';

/**
 * A sheet of watercolour paper, generated once and multiplied over the frame.
 *
 * This is the single cheapest thing that separates "a drawing" from "a render".
 * A flat digital fill is perfectly uniform, and nothing physical is: paper has
 * tooth, pigment pools in the low spots and skips the high ones, and a crayon
 * only touches the peaks. One noise layer at low opacity, composited with
 * `multiply`, reproduces all of that in one draw call — and because it is
 * multiplied it darkens the fills without touching the whites, which is exactly
 * how paper behaves.
 *
 * Generated at a quarter scale and stretched, because grain does not need to
 * resolve and a full-size noise field is four times the work for a texture
 * nobody can see the pixels of.
 */
export function paperTexture(width: number, height: number): HTMLCanvasElement | null {
  if (typeof document === 'undefined') return null;
  const w = Math.max(2, Math.ceil(width / 4));
  const h = Math.max(2, Math.ceil(height / 4));
  const key = `${w}x${h}`;
  if (paper && paperKey === key) return paper;

  const el = document.createElement('canvas');
  el.width = w;
  el.height = h;
  const ctx = el.getContext('2d');
  if (!ctx) return null;

  const image = ctx.createImageData(w, h);
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      // Two octaves: a fine tooth, and a slow mottle for where the wash pooled.
      const fine = noise(x, y, 91);
      const broad = noise(x >> 3, y >> 3, 92);
      const v = 246 + fine * 9 + broad * 6;
      const i = (y * w + x) * 4;
      image.data[i] = v;
      image.data[i + 1] = v - 1;
      image.data[i + 2] = v - 3;
      image.data[i + 3] = 255;
    }
  }
  ctx.putImageData(image, 0, 0);

  paper = el;
  paperKey = key;
  return el;
}

/**
 * Shift a colour toward the shadow.
 *
 * Not "the same colour, darker" — that is what a renderer does and it is why
 * rendered images look plastic. A real shadow is lit by the sky rather than the
 * sun, so it is **cooler and more saturated**, not merely dimmer. Every
 * children's illustration in the world knows this: the shadow side of a red
 * house is purple, not dark red.
 */
export function shaded(colour: string, amount = 1): string {
  const rgb = toRgbTriple(colour);
  if (!rgb) return colour;
  const [r, g, b] = rgb;
  // Toward a blue-violet, and down. The two together are what reads as shade.
  const k = 1 - 0.22 * amount;
  return `rgb(${Math.round(r * k)},${Math.round(g * k + 4 * amount)},${Math.round(Math.min(255, b * k + 22 * amount))})`;
}

/** Lift a colour toward the light, the same way in reverse. */
export function sunlit(colour: string, amount = 1): string {
  const rgb = toRgbTriple(colour);
  if (!rgb) return colour;
  const [r, g, b] = rgb;
  return `rgb(${Math.round(Math.min(255, r + 16 * amount))},${Math.round(Math.min(255, g + 11 * amount))},${Math.round(Math.min(255, b + 2 * amount))})`;
}

function toRgbTriple(c: string): [number, number, number] | null {
  if (c.startsWith('rgb')) {
    const m = c.match(/\d+/g);
    return m && m.length >= 3 ? [+m[0], +m[1], +m[2]] : null;
  }
  if (c[0] !== '#') return null;
  let h = c.slice(1);
  if (h.length === 3) h = h.split('').map((d) => d + d).join('');
  const n = parseInt(h.slice(0, 6), 16);
  return Number.isNaN(n) ? null : [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
