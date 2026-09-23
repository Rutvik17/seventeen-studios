/**
 * Coloured pencil on a 2D canvas: the strokes, washes and handwriting every
 * drawing in the rocket entry is made of, whichever scene it is.
 *
 * Every line goes through `sketch`: the points are nudged by a seeded wobble
 * and drawn twice, a firm pass and a faint one, the way a pencil goes back over
 * a line. Re-seed the wobble and the drawing "boils" like stop-motion pencil
 * animation; keep the seed and it holds still. Colour goes on as a wash with
 * pencil strokes over it, so it reads as coloured pencil rather than flat fill.
 */

import { rng, type Pt } from '@/lib/sketchbook/geometry';

export type Stroke = {
  seed: number;
  color: string;
  width: number;
  /** How far, in px, each point may wander. */
  jitter?: number;
  alpha?: number;
  closed?: boolean;
};

/** What handwriting needs from the page: the paper it sits on and the face it is written in. */
export type Hand = { paper: string; hand: string };

/** Points every `step` px along `pts`, so the wobble follows long straight lines too. */
function densify(pts: Pt[], step: number): Pt[] {
  const out: Pt[] = [pts[0]];
  for (let i = 1; i < pts.length; i += 1) {
    const a = pts[i - 1];
    const b = pts[i];
    const n = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / step));
    for (let k = 1; k <= n; k += 1) out.push({ x: a.x + ((b.x - a.x) * k) / n, y: a.y + ((b.y - a.y) * k) / n });
  }
  return out;
}

export function sketch(ctx: CanvasRenderingContext2D, pts: Pt[], s: Stroke) {
  if (pts.length < 2) return;
  const rand = rng(s.seed);
  const line = densify(s.closed ? [...pts, pts[0]] : pts, 7);
  const jitter = s.jitter ?? 0.9;
  ctx.strokeStyle = s.color;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (let pass = 0; pass < 2; pass += 1) {
    const j = jitter * (pass ? 1.5 : 1);
    ctx.globalAlpha = (s.alpha ?? 1) * (pass ? 0.35 : 0.9);
    ctx.lineWidth = s.width * (pass ? 0.6 : 1);
    const p = line.map((q) => ({ x: q.x + (rand() - 0.5) * 2 * j, y: q.y + (rand() - 0.5) * 2 * j }));
    ctx.beginPath();
    ctx.moveTo(p[0].x, p[0].y);
    for (let i = 1; i < p.length - 1; i += 1) {
      ctx.quadraticCurveTo(p[i].x, p[i].y, (p[i].x + p[i + 1].x) / 2, (p[i].y + p[i + 1].y) / 2);
    }
    ctx.lineTo(p[p.length - 1].x, p[p.length - 1].y);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

/** The outline of `pts` as the current path, closed. */
export function trace(ctx: CanvasRenderingContext2D, pts: Pt[]) {
  ctx.beginPath();
  pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.closePath();
}

export function fill(ctx: CanvasRenderingContext2D, pts: Pt[], color: string, alpha = 1) {
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  trace(ctx, pts);
  ctx.fill();
  ctx.globalAlpha = 1;
}

/** Parallel pencil strokes across `bounds`, at `angle`, drawn only inside the current clip. */
export function hatch(
  ctx: CanvasRenderingContext2D,
  bounds: { x: number; y: number; w: number; h: number },
  gap: number,
  angle: number,
  s: Omit<Stroke, 'closed'>,
) {
  const reach = Math.hypot(bounds.w, bounds.h);
  const cx = bounds.x + bounds.w / 2;
  const cy = bounds.y + bounds.h / 2;
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);
  for (let k = -reach / 2, i = 0; k <= reach / 2; k += gap, i += 1) {
    const ox = cx - dy * k;
    const oy = cy + dx * k;
    sketch(ctx, [{ x: ox - (dx * reach) / 2, y: oy - (dy * reach) / 2 }, { x: ox + (dx * reach) / 2, y: oy + (dy * reach) / 2 }], {
      ...s,
      seed: s.seed + i * 7,
    });
  }
}

/** The box around `pts`. */
function bounds(pts: Pt[]) {
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  pts.forEach((p) => {
    x0 = Math.min(x0, p.x);
    y0 = Math.min(y0, p.y);
    x1 = Math.max(x1, p.x);
    y1 = Math.max(y1, p.y);
  });
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}

/**
 * A shape coloured in: a wash of `color`, then pencil strokes of it on top.
 * Given `within` (usually the page), the strokes stop at its edges — a shape
 * that runs far off the page is only shaded where it can be seen.
 */
export function colourIn(
  ctx: CanvasRenderingContext2D,
  pts: Pt[],
  color: string,
  seed: number,
  gap = 5,
  angle = -Math.PI / 4,
  within?: { x: number; y: number; w: number; h: number },
) {
  fill(ctx, pts, color, 0.55);
  let area = bounds(pts);
  if (within) {
    const x0 = Math.max(area.x, within.x);
    const y0 = Math.max(area.y, within.y);
    const x1 = Math.min(area.x + area.w, within.x + within.w);
    const y1 = Math.min(area.y + area.h, within.y + within.h);
    if (x1 <= x0 || y1 <= y0) return;
    area = { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
  }
  ctx.save();
  trace(ctx, pts);
  ctx.clip();
  hatch(ctx, area, gap, angle, { seed, color, width: 1.1, jitter: 0.5, alpha: 0.7 });
  ctx.restore();
}

/* ------------------------------------------------------------------ *
 * Shading big areas
 * ------------------------------------------------------------------ */

const tiles = new Map<string, CanvasPattern>();

/** Tile size, in CSS pixels. */
const TILE = 96;

/**
 * A pencil-hatched texture: diagonal strokes of `color`, `gap` pixels apart,
 * drawn once into a tile that repeats without a seam. Shading a sky-sized
 * area stroke by stroke costs tens of thousands of curve segments a frame; a
 * texture costs one fill. `variant` picks one of a few wobbles, so a boiling
 * drawing can still boil.
 */
export function texture(ctx: CanvasRenderingContext2D, color: string, gap: number, slope: 1 | -1, variant: number): CanvasPattern | null {
  const dpr = Math.max(1, ctx.getTransform().a);
  const key = `${color}|${gap}|${slope}|${variant % 3}|${dpr}`;
  const found = tiles.get(key);
  if (found) return found;
  if (typeof document === 'undefined') return null;
  const tile = document.createElement('canvas');
  tile.width = tile.height = Math.round(TILE * dpr);
  const t = tile.getContext('2d');
  if (!t) return null;
  t.scale(dpr, dpr);
  // Lines x − slope·y = c, spaced so a whole number fit across the tile; each
  // drawn three times, a tile apart, so strokes that leave one edge come back
  // in at the other.
  const n = Math.max(1, Math.round(TILE / (gap * Math.SQRT2)));
  for (let k = 0; k < n; k += 1) {
    for (const shift of [-TILE, 0, TILE]) {
      const c = (k * TILE) / n + shift;
      const a = slope === 1 ? { x: c, y: 0 } : { x: c, y: TILE };
      const b = slope === 1 ? { x: c + TILE, y: TILE } : { x: c + TILE, y: 0 };
      sketch(t, [a, b], { seed: 97 + k * 13 + (variant % 3) * 1000, color, width: 1.1, jitter: 0.35, alpha: 0.7 });
    }
  }
  const pattern = ctx.createPattern(tile, 'repeat');
  if (!pattern) return null;
  pattern.setTransform(new DOMMatrix().scale(1 / dpr, 1 / dpr));
  tiles.set(key, pattern);
  return pattern;
}

/**
 * A big shape coloured in: a wash of `color`, then the hatched texture over
 * it, pinned to `anchor` on the page so the hatching moves with the world.
 */
export function shade(ctx: CanvasRenderingContext2D, pts: Pt[], color: string, gap: number, slope: 1 | -1, variant: number, anchor: Pt) {
  fill(ctx, pts, color, 0.55);
  const pattern = texture(ctx, color, gap, slope, variant);
  if (!pattern) return;
  const dpr = Math.max(1, ctx.getTransform().a);
  const size = TILE;
  pattern.setTransform(new DOMMatrix().translate(((anchor.x % size) + size) % size, ((anchor.y % size) + size) % size).scale(1 / dpr, 1 / dpr));
  ctx.fillStyle = pattern;
  trace(ctx, pts);
  ctx.fill();
}

/** Handwriting with a paper-coloured halo, so it reads over any colour. */
export function label(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  hand: Hand,
  o: { size: number; color: string; align?: CanvasTextAlign },
) {
  ctx.font = `${o.size}px ${hand.hand}`;
  ctx.textAlign = o.align ?? 'left';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.lineWidth = 4;
  ctx.strokeStyle = hand.paper;
  ctx.globalAlpha = 0.85;
  ctx.strokeText(text, x, y);
  ctx.globalAlpha = 1;
  ctx.fillStyle = o.color;
  ctx.fillText(text, x, y);
}

/** A pencilled arrow from `from` to `to`. */
export function arrow(ctx: CanvasRenderingContext2D, from: Pt, to: Pt, color: string, seed: number, width = 3) {
  const len = Math.hypot(to.x - from.x, to.y - from.y);
  if (len < 4) return;
  const ux = (to.x - from.x) / len;
  const uy = (to.y - from.y) / len;
  const head = Math.min(10, len * 0.35);
  sketch(ctx, [from, to], { seed, color, width, jitter: 0.4 });
  sketch(ctx, [{ x: to.x - ux * head - uy * head * 0.6, y: to.y - uy * head + ux * head * 0.6 }, to, { x: to.x - ux * head + uy * head * 0.6, y: to.y - uy * head - ux * head * 0.6 }], {
    seed: seed + 1, color, width, jitter: 0.3,
  });
}
