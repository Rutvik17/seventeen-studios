/**
 * The sketchbook's pencil: how a line is made to look drawn, and the grain a
 * pencil leaves. Shared by the founder's book (`render.ts`) and the
 * notebook's drawings, so every sketch on the site is drawn by one hand.
 *
 * HOW A LINE IS MADE TO LOOK DRAWN
 *
 * - Two passes, not one. The second is thinner, fainter and a hair off the
 *   first, the way a pencil goes back over a line it did not quite trust.
 * - The wobble is along the line, not per point: a sum of two slow sine waves
 *   of arc length, seeded per stroke. Per-point noise reads as a shaky hand;
 *   a slow drift reads as a confident one that is not a ruler.
 * - The ends overshoot by a few units. A drawn corner is two lines that cross,
 *   not two lines that meet.
 * - Width follows a "pressure" curve and thins at both ends.
 * - Graphite and charcoal are stroked with a grain pattern rather than a flat
 *   colour, so the paper shows through the mark.
 */

import { clamp01, lengthOf, rng, type Pt } from './geometry';

/* ------------------------------------------------------------------ *
 * Strokes
 * ------------------------------------------------------------------ */

export type Pass = { pts: Pt[]; cum: number[]; width: number[] };
export type Prepared = { passes: Pass[]; length: number };

export type LineStyle = {
  seed: number;
  jitter?: number;
  passes?: number;
  overshoot?: number;
  width?: number;
};

export function prepare(base: Pt[], style: LineStyle): Prepared {
  const { seed, jitter = 1.6, passes = 2, overshoot = 6, width = 2 } = style;
  const rand = rng(seed);
  const out: Pass[] = [];
  const length = lengthOf(base);

  for (let k = 0; k < passes; k += 1) {
    const f1 = 0.012 + rand() * 0.01;
    const f2 = 0.045 + rand() * 0.03;
    const p1 = rand() * Math.PI * 2;
    const p2 = rand() * Math.PI * 2;
    const pf = 0.018 + rand() * 0.012;
    const pp = rand() * Math.PI * 2;
    const dx = (rand() - 0.5) * jitter * 0.9;
    const dy = (rand() - 0.5) * jitter * 0.9;
    const amp = jitter * (k === 0 ? 1 : 1.4);
    const over = overshoot * (0.4 + rand() * 0.8) * (k === 0 ? 0.5 : 1);

    const pts: Pt[] = [];
    const cum: number[] = [];
    const widths: number[] = [];
    let s = 0;

    const n = base.length;
    for (let i = 0; i < n; i += 1) {
      const a = base[Math.max(0, i - 1)];
      const b = base[Math.min(n - 1, i + 1)];
      const tl = Math.hypot(b.x - a.x, b.y - a.y) || 1;
      const nx = -(b.y - a.y) / tl;
      const ny = (b.x - a.x) / tl;
      if (i > 0) s += Math.hypot(base[i].x - base[i - 1].x, base[i].y - base[i - 1].y);
      const off = amp * (Math.sin(s * f1 + p1) + 0.6 * Math.sin(s * f2 + p2));
      let x = base[i].x + nx * off + dx;
      let y = base[i].y + ny * off + dy;
      // Overshoot: push the first and last point out along the tangent.
      if (i === 0 && n > 1) {
        x -= ((b.x - a.x) / tl) * over;
        y -= ((b.y - a.y) / tl) * over;
      }
      if (i === n - 1 && n > 1) {
        x += ((b.x - a.x) / tl) * over;
        y += ((b.y - a.y) / tl) * over;
      }
      pts.push({ x, y });
      const taper = Math.min(1, s / 14, (length - s) / 14);
      const pressure = 0.62 + 0.38 * (0.5 + 0.5 * Math.sin(s * pf + pp));
      widths.push(width * (k === 0 ? 1 : 0.55) * pressure * (0.45 + 0.55 * clamp01(taper)));
    }
    for (let i = 0; i < pts.length; i += 1) {
      cum.push(i === 0 ? 0 : cum[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y));
    }
    out.push({ pts, cum, width: widths });
  }
  return { passes: out, length };
}

/**
 * Stroke a prepared line up to `progress` of its length.
 *
 * Drawn in short runs so the width can follow the pressure curve; a single
 * path can only have one `lineWidth`.
 */
export function stroke(
  ctx: CanvasRenderingContext2D,
  line: Prepared,
  progress: number,
  paint: string | CanvasPattern,
  alpha: number,
  widthScale = 1,
) {
  if (progress <= 0 || alpha <= 0) return;
  ctx.strokeStyle = paint;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (let k = 0; k < line.passes.length; k += 1) {
    const pass = line.passes[k];
    const limit = pass.cum[pass.cum.length - 1] * clamp01(progress);
    ctx.globalAlpha = alpha * (k === 0 ? 0.92 : 0.5);
    const RUN = 4;
    for (let i = 0; i < pass.pts.length - 1; i += RUN) {
      if (pass.cum[i] > limit) break;
      ctx.beginPath();
      ctx.moveTo(pass.pts[i].x, pass.pts[i].y);
      let j = i + 1;
      for (; j <= Math.min(i + RUN, pass.pts.length - 1); j += 1) {
        if (pass.cum[j] > limit) {
          const seg = pass.cum[j] - pass.cum[j - 1] || 1;
          const u = (limit - pass.cum[j - 1]) / seg;
          ctx.lineTo(
            pass.pts[j - 1].x + (pass.pts[j].x - pass.pts[j - 1].x) * u,
            pass.pts[j - 1].y + (pass.pts[j].y - pass.pts[j - 1].y) * u,
          );
          break;
        }
        ctx.lineTo(pass.pts[j].x, pass.pts[j].y);
      }
      ctx.lineWidth = pass.width[Math.min(i + 1, pass.width.length - 1)] * widthScale;
      ctx.stroke();
    }
  }
  ctx.globalAlpha = 1;
}

/** A one-off sketchy polyline for shapes that change every frame (the book). */
export function sketchNow(
  ctx: CanvasRenderingContext2D,
  pts: Pt[],
  seed: number,
  paint: string | CanvasPattern,
  alpha: number,
  width: number,
  progress = 1,
) {
  stroke(ctx, prepare(pts, { seed, width, jitter: 1.2, overshoot: 7 }), progress, paint, alpha);
}

/* ------------------------------------------------------------------ *
 * Materials
 * ------------------------------------------------------------------ */

export function makeCanvas(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  return c;
}

/** A grain tile: specks of `colour` at varying strength, with gaps between. */
export function grain(colour: string, seed: number, density: number): HTMLCanvasElement {
  const size = 64;
  const tile = makeCanvas(size, size);
  const g = tile.getContext('2d')!;
  const rand = rng(seed);
  g.fillStyle = colour;
  for (let i = 0; i < size * size * density; i += 1) {
    g.globalAlpha = 0.6 + rand() * 0.4;
    g.fillRect(Math.floor(rand() * size), Math.floor(rand() * size), 1, 1);
  }
  return tile;
}
