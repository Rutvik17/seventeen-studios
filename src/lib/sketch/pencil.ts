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

/** A shape coloured in: a wash of `color`, then pencil strokes of it on top. */
export function colourIn(ctx: CanvasRenderingContext2D, pts: Pt[], color: string, seed: number, gap = 5, angle = -Math.PI / 4) {
  fill(ctx, pts, color, 0.55);
  ctx.save();
  trace(ctx, pts);
  ctx.clip();
  hatch(ctx, bounds(pts), gap, angle, { seed, color, width: 1.1, jitter: 0.5, alpha: 0.7 });
  ctx.restore();
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
