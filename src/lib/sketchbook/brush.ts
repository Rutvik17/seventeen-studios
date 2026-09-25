/**
 * The sketchbook's brush: acrylic paint, laid on in strokes. Shared by the
 * cover's title, the skies behind the cities and the founder's sketchbook, so everything painted on the site is painted by one hand — as
 * everything drawn is drawn by one pencil (`pencil.ts`).
 *
 * HOW A STROKE IS MADE TO LOOK PAINTED
 *
 * - A body first: one opaque stroke of the colour along the path, a little
 *   narrower than the brush, so the paint covers.
 * - Then the bristles: a brush is a row of hairs, and each leaves its own
 *   streak. Each bristle follows the path at its own offset across the brush,
 *   in its own shade of the colour — a touch lighter or darker, as paint that
 *   was not quite mixed — and runs out at its own point near the end, which is
 *   what makes the tail of a stroke dry and broken rather than cut.
 * - Then the raised edge: acrylic is thick, and the edges of a stroke catch the
 *   light on one side and shade on the other. A faint light line along one
 *   edge and a darker one along the other.
 *
 * Everything is seeded, so a stroke is painted the same way every time.
 */

import { rng, type Pt } from './geometry';

type Rgb = [number, number, number];

/** A colour as `#rrggbb` or `rgb(r, g, b)`, as numbers. */
export function toRgb(colour: string): Rgb {
  const c = colour.trim();
  if (c.startsWith('#')) {
    const h = c.length === 4 ? c.slice(1).split('').map((x) => x + x).join('') : c.slice(1, 7);
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  }
  const m = c.match(/[\d.]+/g);
  return m ? [Number(m[0]), Number(m[1]), Number(m[2])] : [0, 0, 0];
}

/** `colour` moved `by` of the way toward white (by > 0) or toward black (by < 0), as a CSS colour. */
export function shade(colour: string | Rgb, by: number): string {
  const [r, g, b] = typeof colour === 'string' ? toRgb(colour) : colour;
  const t = by > 0 ? 255 : 0;
  const k = Math.abs(by);
  const mix = (v: number) => Math.round(v + (t - v) * k);
  return `rgb(${mix(r)}, ${mix(g)}, ${mix(b)})`;
}

export type BrushStyle = {
  /** How wide the brush is, in the context's units. */
  width: number;
  colour: string;
  seed: number;
  /** How much the bristles' shades wander from the colour, 0..1. Default 0.14. */
  streak?: number;
  /** How opaque the whole stroke is. Default 1. */
  alpha?: number;
  /** How dry the tail is: how early the first bristles run out, 0..1. Default 0.18. */
  dry?: number;
  /** Whether to paint the raised edge. Default true. */
  edge?: boolean;
};

/** The path offset `by` across itself, with a slow wander of `wander` units. */
function offset(pts: Pt[], by: number, wander: number, rand: () => number): Pt[] {
  const f = 0.02 + rand() * 0.03;
  const p = rand() * Math.PI * 2;
  let s = 0;
  return pts.map((pt, i) => {
    const a = pts[Math.max(0, i - 1)];
    const b = pts[Math.min(pts.length - 1, i + 1)];
    const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    if (i) s += Math.hypot(pt.x - pts[i - 1].x, pt.y - pts[i - 1].y);
    const o = by + Math.sin(s * f + p) * wander;
    return { x: pt.x - ((b.y - a.y) / len) * o, y: pt.y + ((b.x - a.x) / len) * o };
  });
}

/** The first `u0` to `u1` of a polyline, by length. */
function portion(pts: Pt[], u0: number, u1: number): Pt[] {
  let total = 0;
  for (let i = 1; i < pts.length; i += 1) total += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
  const a = total * u0;
  const b = total * u1;
  const out: Pt[] = [];
  let run = 0;
  for (let i = 1; i < pts.length; i += 1) {
    const d = Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
    const lerp = (t: number) => ({ x: pts[i - 1].x + (pts[i].x - pts[i - 1].x) * t, y: pts[i - 1].y + (pts[i].y - pts[i - 1].y) * t });
    if (!out.length && run + d >= a) out.push(lerp(d ? (a - run) / d : 0));
    if (out.length) {
      if (run + d <= b) out.push(pts[i]);
      else {
        out.push(lerp(d ? (b - run) / d : 0));
        break;
      }
    }
    run += d;
  }
  return out;
}

function trace(ctx: CanvasRenderingContext2D, pts: Pt[]) {
  ctx.beginPath();
  pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
}

/** One stroke of acrylic along `pts`. */
export function paintStroke(ctx: CanvasRenderingContext2D, pts: Pt[], style: BrushStyle) {
  if (pts.length < 2) return;
  const { width, colour, seed, streak = 0.14, alpha = 1, dry = 0.18, edge = true } = style;
  const rand = rng(seed);
  const base = toRgb(colour);
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // The body: square at its ends — a brush is flat, and the bristles below
  // break its ends up; a round end on a wide stroke reads as a disc.
  ctx.globalAlpha = alpha;
  ctx.lineCap = 'butt';
  ctx.strokeStyle = shade(base, 0);
  ctx.lineWidth = width * 0.8;
  trace(ctx, portion(pts, 0.03, 1 - dry * 0.6));
  ctx.stroke();
  ctx.lineCap = 'round';

  // The bristles: nearly straight along the stroke, each starting and running
  // out at its own point, so both ends are ragged.
  const n = Math.max(5, Math.min(48, Math.round(width / 1.4)));
  const hair = (width / n) * 1.8;
  for (let i = 0; i < n; i += 1) {
    const across = (i / (n - 1) - 0.5) * width * 0.94;
    const start = rand() * 0.06;
    const end = 1 - rand() * dry;
    const line = portion(offset(pts, across, Math.min(2, width * 0.01), rand), start, end);
    if (line.length < 2) continue;
    ctx.globalAlpha = alpha * (0.55 + rand() * 0.45);
    ctx.strokeStyle = shade(base, (rand() - 0.5) * 2 * streak);
    ctx.lineWidth = hair * (0.6 + rand() * 0.6);
    trace(ctx, line);
    ctx.stroke();
  }

  // The raised edge: light along one side, shade along the other.
  if (edge) {
    ctx.lineWidth = Math.max(0.6, width * 0.05);
    ctx.globalAlpha = alpha * 0.35;
    ctx.strokeStyle = shade(base, 0.45);
    trace(ctx, portion(offset(pts, -width * 0.44, width * 0.02, rand), 0.02, 1 - dry * 0.7));
    ctx.stroke();
    ctx.globalAlpha = alpha * 0.28;
    ctx.strokeStyle = shade(base, -0.4);
    trace(ctx, portion(offset(pts, width * 0.44, width * 0.02, rand), 0.02, 1 - dry * 0.7));
    ctx.stroke();
  }
  ctx.restore();
}

/**
 * A ground of acrylic over `w` × `h`: loose, overlapping strokes across,
 * leaving the edges uneven, as a quick underpainting does.
 */
export function paintGround(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  colour: string,
  seed: number,
  opts: { alpha?: number; rows?: number } = {},
) {
  const rand = rng(seed);
  const rows = opts.rows ?? Math.max(3, Math.round(h / 60));
  const band = (h / rows) * 1.5;
  for (let r = 0; r < rows; r += 1) {
    const y = ((r + 0.5) / rows) * h + (rand() - 0.5) * band * 0.2;
    const x0 = -band * 0.2 + rand() * w * 0.06;
    const x1 = w + band * 0.2 - rand() * w * 0.06;
    const pts: Pt[] = [];
    for (let i = 0; i <= 12; i += 1) {
      const u = i / 12;
      pts.push({ x: x0 + (x1 - x0) * u, y: y + Math.sin(u * Math.PI * (1 + rand())) * band * 0.08 });
    }
    paintStroke(ctx, r % 2 ? pts.reverse() : pts, { width: band, colour, seed: seed * 31 + r, alpha: opts.alpha ?? 1, streak: 0.08, dry: 0.3 });
  }
}

/** A short dab of paint centred on (x, y), `length` long and `width` wide, at `angle`. */
export function paintDab(ctx: CanvasRenderingContext2D, x: number, y: number, length: number, width: number, angle: number, colour: string, seed: number, alpha = 1) {
  const ux = Math.cos(angle) * (length / 2);
  const uy = Math.sin(angle) * (length / 2);
  const bow = (rng(seed)() - 0.5) * width * 0.3;
  const pts: Pt[] = [];
  for (let i = 0; i <= 6; i += 1) {
    const u = i / 6;
    const b = Math.sin(u * Math.PI) * bow;
    pts.push({ x: x - ux + 2 * ux * u - Math.sin(angle) * b, y: y - uy + 2 * uy * u + Math.cos(angle) * b });
  }
  paintStroke(ctx, pts, { width, colour, seed, alpha, streak: 0.12, dry: 0.25 });
}
