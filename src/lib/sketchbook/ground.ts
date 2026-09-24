/**
 * The ground every page is laid on: a canvas brushed over with soft, pale
 * acrylic — broad strokes across in warm tints, a few more across those at a
 * slant, and a few lighter ones on top, the way a painter tones a canvas
 * before starting. Everything else on the site is drawn on top of it.
 *
 * Painted once, when the site is built (`scripts/make-ground.mjs`), in the
 * tints the stylesheet declares (`--ground-1` … `-5`), so no visitor's
 * browser spends time on it and the colours are written in one place.
 */

import { rng } from './geometry';
import { paintStroke } from './brush';

/** A `w` × `h` canvas of the ground, on `base`, brushed with `tints`. */
export function paintPageGround(w: number, h: number, base: string, tints: string[], seed = 17): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, w, h);
  const rand = rng(seed);
  const unit = Math.min(w, h);
  const tint = () => tints[Math.floor(rand() * tints.length)];

  /** A stroke from (x0, y0) to (x1, y1), bowed a little. */
  const stroke = (x0: number, y0: number, x1: number, y1: number, width: number, colour: string, alpha: number, k: number) => {
    const bow = (rand() - 0.5) * width * 0.5;
    const nx = -(y1 - y0);
    const ny = x1 - x0;
    const len = Math.hypot(nx, ny) || 1;
    const pts = Array.from({ length: 16 }, (_, i) => {
      const u = i / 15;
      const b = Math.sin(u * Math.PI) * bow;
      return { x: x0 + (x1 - x0) * u + (nx / len) * b, y: y0 + (y1 - y0) * u + (ny / len) * b };
    });
    paintStroke(ctx, pts, { width, colour, seed: seed * 1000 + k, alpha, streak: 0.07, dry: 0.28, edge: false });
  };

  let k = 0;
  // Strokes across, end to end in rows and overlapping, each a little off
  // level — the canvas covered, but never evenly.
  const rows = Math.round(h / (unit * 0.085));
  for (let r = -1; r <= rows + 1; r += 1) {
    let x = -unit * 0.15 - rand() * unit * 0.2;
    const y = (r / rows) * h;
    while (x < w + unit * 0.1) {
      const len = unit * (0.45 + rand() * 0.7);
      const tilt = (rand() - 0.5) * unit * 0.05;
      stroke(x, y - tilt, x + len, y + tilt, unit * (0.12 + rand() * 0.06), tint(), 0.5 + rand() * 0.35, (k += 1));
      x += len * (0.6 + rand() * 0.3);
    }
  }
  // Some across those, at a slant.
  for (let i = 0; i < Math.round((w * h) / (unit * unit * 0.18)); i += 1) {
    const x = rand() * w;
    const y = rand() * h;
    const angle = (rand() < 0.5 ? -1 : 1) * (0.12 + rand() * 0.4);
    const len = unit * (0.2 + rand() * 0.3);
    stroke(x, y, x + Math.cos(angle) * len, y + Math.sin(angle) * len, unit * (0.06 + rand() * 0.05), tint(), 0.3 + rand() * 0.25, (k += 1));
  }
  // A few lighter ones on top.
  for (let i = 0; i < Math.round((w * h) / (unit * unit * 0.4)); i += 1) {
    const x = rand() * w;
    const y = rand() * h;
    const len = unit * (0.15 + rand() * 0.25);
    stroke(x, y, x + len, y + (rand() - 0.5) * unit * 0.05, unit * (0.035 + rand() * 0.03), tints[0], 0.4 + rand() * 0.3, (k += 1));
  }
  return canvas;
}
