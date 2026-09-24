/**
 * The world, coloured flat: a map of the whole Earth, longitude across and
 * latitude down, coloured in crayon. The page wraps it onto the ball every
 * frame (`render.ts`).
 *
 * The colouring is the same every time — its marks come from a fixed seed —
 * so it is done once, when the site is built (`scripts/make-globe-sheet.mjs`
 * calls `paintSheet`), and the page loads the picture (`sheetFrom`) rather
 * than spending seconds colouring the world on every visit.
 *
 * A map stretches the world sideways more the further it is from the equator
 * — every line of latitude is as wide as the equator — so each crayon patch
 * is drawn stretched by the same amount (1 ÷ the cosine of its latitude). On
 * the ball the stretch and the map's cancel, and a crayon mark near the pole
 * is the same width as one at the equator.
 *
 * The crayon stays inside the coastlines: land patches are clipped to the
 * land, sea patches to the sea. Each mark is a waxy stroke — the crayon's
 * colour, a darker edge on one side where it pressed, a lighter one on the
 * other, and broken streaks along it where the wax dragged — and marks build
 * up where they cross. (The flecks of paper through the wax are the paper's
 * tooth, laid on by the page.)
 *
 * Once coloured, the map is read into arrays the page samples, with half-,
 * quarter- and eighth-size copies for where the ball's rim squeezes it.
 */

import { rng } from '@/lib/sketchbook/geometry';
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

type Rgb = [number, number, number];

function rgb(hex: string): Rgb {
  const h = hex.trim().replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

const toward = (c: Rgb, to: Rgb, u: number) => `rgb(${c.map((v, i) => Math.round(v + (to[i] - v) * u)).join(', ')})`;

/**
 * The world coloured with `patches`, on a map `width` pixels across (and half
 * as tall), in `crayons` (one colour per crayon, in `CRAYONS` order).
 */
export function paintSheet(width: number, patches: readonly Patch[], crayons: readonly string[]): HTMLCanvasElement {
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

  const colours = crayons.map(rgb);
  const body = colours.map((c) => toward(c, c, 0));
  const darker = colours.map((c) => toward(c, [30, 20, 40], 0.3));
  const lighter = colours.map((c) => toward(c, [255, 250, 235], 0.32));
  const perX = W / 360;
  const perY = H / 180;

  /** One patch, as crayon: the body, a pressed edge, a light edge, and broken streaks of wax — drawn where it sits, and again a map's width over if it runs off an edge. */
  function draw(p: Patch) {
    const k = 1 / Math.max(0.05, Math.cos(p.lat * DEG));
    const w = p.width * perX;
    const pts: [number, number][] = [];
    for (let i = 0; i < p.pts.length; i += 2) pts.push([((p.pts[i] - p.lon) * perX) / k, (90 - p.pts[i + 1]) * perY]);
    const xs = pts.map(([x]) => x);
    const col = ((p.lon + 180) / 360) * W;
    const places = [col];
    if (col + (Math.min(...xs) - w) * k < 0) places.push(col + W);
    if (col + (Math.max(...xs) + w) * k > W) places.push(col - W);
    // Across the line's direction, in these stretched coordinates (y runs south).
    const nx = Math.sin(p.angle);
    const ny = Math.cos(p.angle);
    const r = rng(Math.round(p.lon * 1000 + p.lat * 7));
    const dashes = [w * (0.6 + r() * 1.6), w * (0.3 + r() * 0.9), w * (0.3 + r()), w * (0.5 + r())];
    for (const at of places) {
      ctx.setTransform(k, 0, 0, 1, at, 0);
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      // The path, a run at a time wherever its crayon changes.
      let from = 0;
      for (let i = 1; i <= pts.length; i += 1) {
        if (i < pts.length && p.crayon[i] === p.crayon[from]) continue;
        const run = pts.slice(from, Math.min(pts.length, i + 1));
        const c = p.crayon[from];
        const path = (off: number) => {
          ctx.beginPath();
          run.forEach(([x, y], j) => (j ? ctx.lineTo(x + nx * off, y + ny * off) : ctx.moveTo(x + nx * off, y + ny * off)));
        };
        ctx.setLineDash([]);
        ctx.globalAlpha = 0.9;
        ctx.strokeStyle = body[c];
        ctx.lineWidth = w;
        path(0);
        ctx.stroke();
        ctx.globalAlpha = 0.42;
        ctx.strokeStyle = darker[c];
        ctx.lineWidth = w * 0.28;
        path(w * 0.32);
        ctx.stroke();
        ctx.globalAlpha = 0.36;
        ctx.strokeStyle = lighter[c];
        ctx.lineWidth = w * 0.22;
        path(-w * 0.34);
        ctx.stroke();
        // Wax dragged along the stroke: broken streaks, a little lighter and darker.
        ctx.lineWidth = w * 0.14;
        ctx.setLineDash(dashes);
        ctx.globalAlpha = 0.3;
        ctx.strokeStyle = lighter[c];
        path(-w * 0.08);
        ctx.stroke();
        ctx.strokeStyle = darker[c];
        path(w * 0.12);
        ctx.stroke();
        from = i;
      }
    }
    ctx.setLineDash([]);
  }

  for (const seaSide of [false, true]) {
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (seaSide) ctx.clip(sea, 'evenodd');
    else ctx.clip(land);
    patches.filter((p) => p.sea === seaSide).forEach(draw);
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
