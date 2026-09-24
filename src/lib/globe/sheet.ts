/**
 * The world, painted flat: a map of the whole Earth, longitude across and
 * latitude down, painted in acrylic. The page wraps it onto the ball every
 * frame (`render.ts`).
 *
 * The painting is the same every time — its marks come from a fixed seed — so
 * it is done once, when the site is built (`scripts/make-globe-sheet.mjs`
 * calls `paintSheet`), and the page loads the picture (`sheetFrom`) rather
 * than spending seconds painting the world on every visit.
 *
 * A map stretches the world sideways more the further it is from the equator
 * — every line of latitude is as wide as the equator — so each patch of paint
 * is laid stretched by the same amount (1 ÷ the cosine of its latitude). On
 * the ball the stretch and the map's cancel, and a brushstroke near the pole
 * is the same width as one at the equator.
 *
 * The paint stays inside the coastlines: land patches are clipped to the land,
 * sea patches to the sea. Each patch is a few strokes of a brush laid side by
 * side (`brush.ts`): opaque, streaked by the bristles, ragged at their ends,
 * with a faint raised edge — and strokes build up where they cross.
 *
 * Once painted, the map is read into arrays the page samples, with half-,
 * quarter- and eighth-size copies for where the ball's rim squeezes it.
 */

import { paintStroke } from '@/lib/sketchbook/brush';
import { LAND } from './land';
import type { Patch } from './marks';

const DEG = Math.PI / 180;

export type Level = { data: Uint32Array; width: number; height: number };

export type Sheet = {
  width: number;
  height: number;
  /** The map at full size, then at half, a quarter and an eighth, as packed RGBA. */
  levels: Level[];
};

/**
 * The world painted with `patches`, on a map `width` pixels across (and half
 * as tall), in `paints` (one colour per paint, in `PAINTS` order).
 */
export function paintSheet(width: number, patches: readonly Patch[], paints: readonly string[]): HTMLCanvasElement {
  const W = width;
  const H = width / 2;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;

  // The coastlines on the map, for clipping: land inside them, sea outside.
  const land = new Path2D();
  for (const ring of LAND) {
    for (let i = 0; i < ring.length; i += 2) {
      const x = ((ring[i] + 180) / 360) * W;
      const y = ((90 - ring[i + 1]) / 180) * H;
      if (i) land.lineTo(x, y);
      else land.moveTo(x, y);
    }
    land.closePath();
  }
  const sea = new Path2D();
  sea.rect(-2, -2, W + 4, H + 4);
  sea.addPath(land);

  const perX = W / 360;
  const perY = H / 180;

  /**
   * One patch, in paint: its back-and-forth path cut into its strokes — a new
   * stroke wherever the path turns back, or its paint changes — each laid with
   * the brush where the patch sits, and again a map's width over if it runs
   * off an edge.
   */
  function draw(p: Patch, n: number) {
    const k = 1 / Math.max(0.05, Math.cos(p.lat * DEG));
    const w = p.width * perX;
    const pts: [number, number][] = [];
    for (let i = 0; i < p.pts.length; i += 2) pts.push([((p.pts[i] - p.lon) * perX) / k, (90 - p.pts[i + 1]) * perY]);
    const xs = pts.map(([x]) => x);
    const col = ((p.lon + 180) / 360) * W;
    const places = [col];
    if (col + (Math.min(...xs) - w) * k < 0) places.push(col + W);
    if (col + (Math.max(...xs) + w) * k > W) places.push(col - W);

    const strokes: { pts: { x: number; y: number }[]; paint: number }[] = [];
    let run = [pts[0]];
    for (let i = 1; i < pts.length; i += 1) {
      const a = run[run.length - 1];
      const prev = run.length > 1 ? run[run.length - 2] : null;
      const turns = prev && (a[0] - prev[0]) * (pts[i][0] - a[0]) + (a[1] - prev[1]) * (pts[i][1] - a[1]) < 0;
      if (turns || p.paint[i] !== p.paint[i - 1]) {
        if (run.length > 1) strokes.push({ pts: run.map(([x, y]) => ({ x, y })), paint: p.paint[i - 1] });
        run = [a];
      }
      run.push(pts[i]);
    }
    if (run.length > 1) strokes.push({ pts: run.map(([x, y]) => ({ x, y })), paint: p.paint[pts.length - 1] });

    for (const at of places) {
      ctx.setTransform(k, 0, 0, 1, at, 0);
      strokes.forEach((s, j) => {
        paintStroke(ctx, s.pts, { width: w * 1.3, colour: paints[s.paint], seed: n * 97 + j, streak: 0.12, dry: 0.2, alpha: 0.96 });
      });
    }
  }

  for (const seaSide of [false, true]) {
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (seaSide) ctx.clip(sea, 'evenodd');
    else ctx.clip(land);
    patches.forEach((p, n) => p.sea === seaSide && draw(p, n));
    ctx.restore();
  }

  return canvas;
}

/**
 * The coloured map, read from its picture into the arrays the page samples,
 * with each smaller copy made by the canvas scaling it down — which averages
 * by how much colour each pixel holds, so the edge of a coloured patch does
 * not go grey against the blank paper beside it.
 */
export function sheetFrom(picture: CanvasImageSource, width: number): Sheet {
  const levels: Level[] = [];
  for (let L = 0; L < 4; L += 1) {
    const w = width >> L;
    const h = w / 2;
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const g = c.getContext('2d', { willReadFrequently: true })!;
    g.imageSmoothingEnabled = true;
    g.imageSmoothingQuality = 'high';
    g.drawImage(picture, 0, 0, w, h);
    levels.push({ data: new Uint32Array(g.getImageData(0, 0, w, h).data.buffer), width: w, height: h });
  }
  return { width, height: width / 2, levels };
}
