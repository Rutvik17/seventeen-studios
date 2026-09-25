/**
 * THE PORTRAIT — Rutvik, sketched from a photograph and painted in, as a
 * painter would: line and wash, not a photograph run through a filter.
 *
 * A painter does not copy every tone in a photograph. They squint: the
 * picture falls into a handful of shapes, each one colour, and those shapes
 * are what get drawn and what get painted. So the photograph is squinted at
 * first — reduced to a few paints by k-means clustering (grouping every pixel
 * with the nearest of a few average colours, and moving each average to the
 * middle of its group, until they settle), and each small speck merged into
 * the shape around it. Then:
 *
 * - **Pencil.** Contours are drawn where one of those shapes meets another,
 *   along the edge rather than across it — the line of a jaw, a collar, a
 *   spire — and, in the face, along the finer changes of tone that make the
 *   eyes, nose and mouth. The strokes go from the face outward, where a
 *   portraitist starts. The pencil stays visible under the paint.
 * - **Watercolour.** Each shape is laid in its own paint, lighter than the
 *   photograph — watercolour is transparent, and the paper's white does the
 *   work of the lights, which are left unpainted. Where one paint meets
 *   another the pigment dries darker, as it does at the rim of a wash; the
 *   paper's grain shows through as speckle. The first, loose wash is just the
 *   picture's colours, blurred to nothing; the shaped paints go over it; the
 *   face and hands get the finest brush. The edges fray into the page, and a
 *   few spatters of the painting's own colours land around it.
 *
 * The lights in a photograph (lamps on water) can be found and returned too,
 * so the film can make them twinkle.
 */

import type { FounderPhoto } from '@/content/founder';
import { between, gauss, rng, smooth, type Rng } from '@/lib/film/random';
import { blob, Wash, type Glazed, type Pt } from '@/lib/film/wash';
import { pencil, type Stroke } from '@/lib/film/pencil';

export interface Portrait {
  ink: Stroke[];
  washes: Glazed[];
  /** The photograph's bright lights, in world units, with their colour. */
  lights: { x: number; y: number; r: number; colour: string }[];
}

type Region = { x: number; y: number; w: number; h: number };

/** The paints the picture is squinted down to. */
const PAINTS = 14;
/** The paper, which every paint is thinned toward. */
const PAPER = [245, 240, 230];

export function loadPhoto(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/** The world area a photograph is painted in: 860 high, centred on the world's 1600 × 1000. */
export function regionFor(aspect: number): Region {
  const h = 860;
  const w = Math.min(900, h * aspect);
  return { x: 800 - w / 2, y: 70, w, h: w / aspect };
}

/* ------------------------------------------------------------------ *
 * Squinting                                                          *
 * ------------------------------------------------------------------ */

interface Squint {
  W: number;
  H: number;
  /** The paint each pixel belongs to. */
  label: Uint8Array;
  /** Each paint's colour, as the photograph has it. */
  centres: number[][];
  /** The photograph's own brightness, 0–1. */
  lum: Float32Array;
  rgb: Uint8ClampedArray;
}

function read(img: HTMLImageElement, W: number, H: number): Uint8ClampedArray {
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const x = c.getContext('2d', { willReadFrequently: true })!;
  x.imageSmoothingQuality = 'high';
  x.drawImage(img, 0, 0, W, H);
  return x.getImageData(0, 0, W, H).data;
}

function squint(img: HTMLImageElement, W: number, H: number): Squint {
  const px = read(img, W, H);
  const n = W * H;
  const lum = new Float32Array(n);
  for (let i = 0; i < n; i++) lum[i] = (0.299 * px[i * 4] + 0.587 * px[i * 4 + 1] + 0.114 * px[i * 4 + 2]) / 255;
  // k-means, started from pixels spread through the picture's brightness range.
  const order = Array.from({ length: n }, (_, i) => i).sort((a, b) => lum[a] - lum[b]);
  let centres = Array.from({ length: PAINTS }, (_, k) => {
    const i = order[Math.floor(((k + 0.5) / PAINTS) * n)];
    return [px[i * 4], px[i * 4 + 1], px[i * 4 + 2]];
  });
  const label = new Uint8Array(n);
  for (let it = 0; it < 10; it++) {
    const sum = centres.map(() => [0, 0, 0, 0]);
    for (let i = 0; i < n; i++) {
      let best = 0;
      let bd = Infinity;
      for (let k = 0; k < PAINTS; k++) {
        const c = centres[k];
        const d = (px[i * 4] - c[0]) ** 2 + (px[i * 4 + 1] - c[1]) ** 2 + (px[i * 4 + 2] - c[2]) ** 2;
        if (d < bd) {
          bd = d;
          best = k;
        }
      }
      label[i] = best;
      const s = sum[best];
      s[0] += px[i * 4];
      s[1] += px[i * 4 + 1];
      s[2] += px[i * 4 + 2];
      s[3]++;
    }
    centres = centres.map((c, k) => (sum[k][3] ? [sum[k][0] / sum[k][3], sum[k][1] / sum[k][3], sum[k][2] / sum[k][3]] : c));
  }
  // Specks merge into the shape around them: each pixel takes the commonest paint near it, twice.
  for (let pass = 0; pass < 2; pass++) {
    const next = new Uint8Array(n);
    const count = new Uint16Array(PAINTS);
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) {
        count.fill(0);
        for (let dy = -2; dy <= 2; dy++)
          for (let dx = -2; dx <= 2; dx++) {
            const xx = Math.min(W - 1, Math.max(0, x + dx));
            const yy = Math.min(H - 1, Math.max(0, y + dy));
            count[label[yy * W + xx]]++;
          }
        let best = label[y * W + x];
        for (let k = 0; k < PAINTS; k++) if (count[k] > count[best]) best = k;
        next[y * W + x] = best;
      }
    label.set(next);
  }
  return { W, H, label, centres, lum, rgb: px };
}

/** A paint as it goes on paper: richer than the photograph, thinned toward the paper, never black. */
function pigment(c: number[], sat = 1.1): number[] {
  const m = (c[0] + c[1] + c[2]) / 3;
  let v = c.map((x) => m + (x - m) * sat);
  // The darkest paints are indigo and sepia, not black.
  const dark = Math.max(0, 1 - m / 95);
  v = v.map((x, i) => x * (1 - dark * 0.55) + [52, 58, 96][i] * dark * 0.55);
  // Thinned: a watercolour is lighter than the thing it paints.
  return v.map((x, i) => Math.round(Math.max(0, Math.min(255, x * 0.78 + PAPER[i] * 0.22))));
}

/** 1 inside a box, falling to 0 a little way outside it. */
function near(u: number, v: number, b?: { u: number; v: number; w: number; h: number }): number {
  if (!b) return 0;
  const dx = Math.max(b.u - u, 0, u - (b.u + b.w)) / b.w;
  const dy = Math.max(b.v - v, 0, v - (b.v + b.h)) / b.h;
  return 1 - smooth(0, 0.35, Math.hypot(dx, dy));
}

/** A colour with its brightness stepped into eight tones, its hue kept: a face laid in a few washes. */
function stepped(R: number, G: number, B: number): number[] {
  const m = Math.max(1, (R + G + B) / 3);
  const q = (Math.round((m / 255) * 8) / 8) * 255 + 10;
  return pigment([(R * q) / m, (G * q) / m, (B * q) / m], 1.05);
}

/* ------------------------------------------------------------------ *
 * The painting                                                       *
 * ------------------------------------------------------------------ */

export function portrait(img: HTMLImageElement, photo: FounderPhoto, region: Region, seed = 1702): Portrait {
  const r = rng(seed);
  const SW = 240;
  const SH = Math.round(SW / photo.aspect);
  const sq = squint(img, SW, SH);
  const k = region.w / SW;
  const W = (x: number, y: number): Pt => [region.x + x * k, region.y + y * k];
  const inBox = (u: number, v: number, b?: FounderPhoto['face']) => !!b && u >= b.u && u <= b.u + b.w && v >= b.v && v <= b.v + b.h;
  const fine = (u: number, v: number) => inBox(u, v, photo.face) || inBox(u, v, photo.hands);
  const faceC = { u: photo.face.u + photo.face.w / 2, v: photo.face.v + photo.face.h / 2 };
  const paints = sq.centres.map((c) => pigment(c));
  const shade = sq.centres.map((c) => (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) / 255);

  /* ---------------- the pencil ---------------- */

  // The squinted picture's brightness: one value per shape, so its edges are the shapes' edges.
  const flat = new Float32Array(SW * SH);
  for (let i = 0; i < SW * SH; i++) flat[i] = shade[sq.label[i]];
  const blurred = (src: Float32Array) => {
    const out = new Float32Array(SW * SH);
    for (let y = 0; y < SH; y++)
      for (let x = 0; x < SW; x++) {
        let s = 0;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) s += src[Math.min(SH - 1, Math.max(0, y + dy)) * SW + Math.min(SW - 1, Math.max(0, x + dx))];
        out[y * SW + x] = s / 9;
      }
    return out;
  };
  const shapes = blurred(flat);
  const tones = blurred(sq.lum);
  const strokes: { pts: Pt[]; d: number; tone: number; width: number }[] = [];
  const trace = (field: Float32Array, thr: number, keep: (u: number, v: number) => boolean, tone: number, width: number, maxLen: number) => {
    const B = (x: number, y: number) => field[Math.min(SH - 1, Math.max(0, Math.round(y))) * SW + Math.min(SW - 1, Math.max(0, Math.round(x)))];
    const grad = (x: number, y: number) => {
      const gx = B(x + 1, y - 1) + 2 * B(x + 1, y) + B(x + 1, y + 1) - B(x - 1, y - 1) - 2 * B(x - 1, y) - B(x - 1, y + 1);
      const gy = B(x - 1, y + 1) + 2 * B(x, y + 1) + B(x + 1, y + 1) - B(x - 1, y - 1) - 2 * B(x, y - 1) - B(x + 1, y - 1);
      return [gx, gy, Math.hypot(gx, gy)] as const;
    };
    const used = new Uint8Array(SW * SH);
    for (let y = 2; y < SH - 2; y++)
      for (let x = 2; x < SW - 2; x++) {
        if (!keep(x / SW, y / SH) || used[y * SW + x]) continue;
        const [, , m] = grad(x, y);
        if (m < thr) continue;
        const run: Pt[] = [];
        for (const dir of [1, -1]) {
          let qx = x;
          let qy = y;
          const part: Pt[] = [];
          for (let s = 0; s < maxLen; s++) {
            const [gx, gy, gm] = grad(qx, qy);
            if (gm < thr * 0.5) break;
            qx += (-gy / gm) * dir;
            qy += (gx / gm) * dir;
            const i = Math.round(qy) * SW + Math.round(qx);
            if (qx < 1 || qy < 1 || qx > SW - 2 || qy > SH - 2 || used[i]) break;
            part.push([qx, qy]);
          }
          if (dir === 1) run.push(...part.reverse(), [x, y]);
          else run.push(...part);
        }
        // Once drawn, an edge and the pixels either side of it are done: the pencil does not go over it twice.
        for (const [a, b] of run) {
          const i = Math.round(b) * SW + Math.round(a);
          for (const o of [0, 1, -1, SW, -SW]) if (i + o >= 0 && i + o < used.length) used[i + o] = 1;
        }
        const xs = run.map((q) => q[0]);
        const ys = run.map((q) => q[1]);
        if (Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)) < (maxLen > 20 ? 5 : 2.5)) continue;
        // A hand simplifies: keep every other point.
        const pts = run.filter((_, i) => i % 2 === 0 || i === run.length - 1);
        const mid = run[Math.floor(run.length / 2)];
        strokes.push({ pts: pts.map(([a, b]) => W(a, b)), d: Math.hypot(mid[0] / SW - faceC.u, (mid[1] / SH - faceC.v) / photo.aspect), tone, width });
      }
  };
  // The face first, finely; then the big shapes; the edges of the picture are left to fray.
  trace(tones, 0.13, fine, 0.9, 1.1, 20);
  trace(shapes, 0.3, (u, v) => !fine(u, v) && u > 0.06 && u < 0.94 && v > 0.05 && v < 0.95, 0.7, 1, 40);
  strokes.sort((a, b) => a.d - b.d);
  const ink = strokes.map((s) => pencil(s.pts, r, { width: s.width, tone: s.tone, wobble: 0.5, overshoot: s.pts.length > 3 ? 2.5 : 1 }));

  /* ---------------- the watercolour ---------------- */

  const firstWash = looseWash(img, photo.aspect);
  const loose = document.createElement('canvas').getContext('2d')!.createPattern(firstWash, 'no-repeat')!;
  const shaped = paintShapes(sq, paints, photo, rng(seed + 1));
  const shapedPattern = document.createElement('canvas').getContext('2d')!.createPattern(shaped, 'no-repeat')!;
  const place = (p: CanvasPattern, w: number) => p.setTransform(new DOMMatrix([region.w / w, 0, 0, region.w / w, region.x, region.y]));
  place(loose, firstWash.width);
  place(shapedPattern, shaped.width);

  const washes: Glazed[] = [];
  const fx = region.x + faceC.u * region.w;
  const fy = region.y + faceC.v * region.h;
  const layerOf = (step: number, rad: number, alpha: number, layers: number, rimmed: boolean, fill: CanvasPattern, keep: (u: number, v: number) => boolean) => {
    const cells: Pt[] = [];
    for (let y = step / 2; y < region.h; y += step)
      for (let x = step / 2; x < region.w; x += step) {
        const u = x / region.w;
        const v = y / region.h;
        if (!keep(u, v)) continue;
        const e = Math.max(Math.abs(u - 0.5) * 2, Math.abs(v - 0.5) * 2);
        if (e > 0.75 && r() < (e - 0.75) * 4) continue;
        cells.push([region.x + x + gauss(r) * step * 0.25, region.y + y + gauss(r) * step * 0.25]);
      }
    // A painter works outward from where the picture is: the face first.
    cells.sort((p, q) => Math.hypot(p[0] - fx, p[1] - fy) - Math.hypot(q[0] - fx, q[1] - fy));
    for (const [x, y] of cells) washes.push(new Glaze(x, y, rad * between(r, 0.8, 1.25), fill, alpha, layers, rimmed, r));
  };
  // The first wash: loose, pale, wet — the picture's colours and nothing else.
  layerOf(region.w / 7, region.w / 5.5, 0.07, 5, false, loose, () => true);
  // The shapes, each in its paint.
  layerOf(region.w / 16, region.w / 12, 0.12, 5, true, shapedPattern, (u, v) => u > 0.05 && u < 0.95 && v > 0.04 && v < 0.96);
  // The face and hands, with the smallest brush.
  layerOf(region.w / 44, region.w / 30, 0.14, 4, true, shapedPattern, (u, v) => fine(u, v));

  // Spatter: a flick of the brush, in the painting's own colours, around its edge.
  const loud = paints.filter((c) => Math.max(...c) - Math.min(...c) > 40);
  const pool = loud.length ? loud : paints;
  for (let i = 0; i < 26; i++) {
    const a = r() * Math.PI * 2;
    const rr = 0.52 + r() * 0.12;
    const x = region.x + region.w * (0.5 + Math.cos(a) * rr);
    const y = region.y + region.h * (0.5 + Math.sin(a) * rr * 0.96);
    const c = pool[Math.floor(r() * pool.length)];
    const size = between(r, 2, 9) * (region.w / 640);
    washes.push(new Wash(blob(x, y, size, size, r, 7), { color: `#${c.map((v) => v.toString(16).padStart(2, '0')).join('')}`, layers: 3, alpha: 0.35, spread: 0.3, edge: 0.6 }, r));
  }

  /* ---------------- the lights ---------------- */

  const lights: Portrait['lights'] = [];
  if (photo.lights) {
    for (let y = Math.floor(SH * 0.5); y < SH - 1; y++)
      for (let x = 1; x < SW - 1; x++) {
        const i = y * SW + x;
        if (fine(x / SW, y / SH)) continue;
        const l = sq.lum[i];
        if (l < 0.72 || l < sq.lum[i - 1] || l < sq.lum[i + 1] || r() > 0.5 || lights.length > 90) continue;
        const [wx, wy] = W(x, y);
        lights.push({ x: wx, y: wy, r: k * 2, colour: `${sq.rgb[i * 4]},${sq.rgb[i * 4 + 1]},${sq.rgb[i * 4 + 2]}` });
      }
  }
  return { ink, washes, lights };
}

/** The first wash: the picture shrunk to a few dozen patches of colour, thinned. */
function looseWash(img: HTMLImageElement, aspect: number): HTMLCanvasElement {
  const sw = 12;
  const sh = Math.round(sw / aspect);
  const px = read(img, sw, sh);
  const small = document.createElement('canvas');
  small.width = sw;
  small.height = sh;
  const sx = small.getContext('2d')!;
  const d = sx.createImageData(sw, sh);
  for (let i = 0; i < px.length; i += 4) {
    const p = pigment([px[i], px[i + 1], px[i + 2]]);
    const x = (i / 4) % sw;
    const y = Math.floor(i / 4 / sw);
    // Thin at the edges, so the painting never sits in a rectangle.
    const edge = Math.min(x, sw - 1 - x, (y * sw) / sh, ((sh - 1 - y) * sw) / sh);
    d.data[i] = p[0];
    d.data[i + 1] = p[1];
    d.data[i + 2] = p[2];
    d.data[i + 3] = edge < 1 ? 0 : 255;
  }
  sx.putImageData(d, 0, 0);
  const out = document.createElement('canvas');
  out.width = 60;
  out.height = Math.round(60 / aspect);
  const o = out.getContext('2d')!;
  o.imageSmoothingQuality = 'high';
  o.drawImage(small, 0, 0, out.width, out.height);
  return out;
}

/**
 * The shapes, each in its paint: lights left as paper, a darker rim where one
 * paint meets another, the paper's grain through all of it, and the edges
 * frayed into the page.
 */
function paintShapes(sq: Squint, paints: number[][], photo: FounderPhoto, r: Rng): HTMLCanvasElement {
  const { W, H, label } = sq;
  const S = 3;
  const OW = W * S;
  const OH = H * S;
  const base = document.createElement('canvas');
  base.width = W;
  base.height = H;
  const bx = base.getContext('2d')!;
  const d = bx.createImageData(W, H);
  const shade = paints.map((c) => (c[0] + c[1] + c[2]) / 765);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      const l = label[i];
      const u = x / W;
      const v = y / H;
      // Within a shape the paint is not flat: some of the picture's own colour runs in, as wet paint does.
      const own = pigment([sq.rgb[i * 4], sq.rgb[i * 4 + 1], sq.rgb[i * 4 + 2]]);
      let c = paints[l].map((p, j) => p * 0.6 + own[j] * 0.4);
      // In the face and hands the likeness matters more than the shapes: the photograph's own
      // colour there, its brightness stepped into a few tones as a painter would lay them —
      // feathered in, so there is no box.
      const f = Math.max(near(u, v, photo.face), near(u, v, photo.hands));
      if (f > 0) {
        const st = stepped(sq.rgb[i * 4], sq.rgb[i * 4 + 1], sq.rgb[i * 4 + 2]);
        c = c.map((p, j) => p * (1 - f) + st[j] * f);
      }
      // Where this paint meets a clearly different one, the pigment that ran to the edge dries darker.
      let rim = false;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const xx = x + dx;
        const yy = y + dy;
        if (xx >= 0 && yy >= 0 && xx < W && yy < H) {
          const o = label[yy * W + xx];
          if (o !== l && Math.abs(shade[o] - shade[l]) > 0.14) rim = true;
        }
      }
      const dark = rim ? 0.88 : 1;
      d.data[i * 4] = c[0] * dark;
      d.data[i * 4 + 1] = c[1] * dark;
      d.data[i * 4 + 2] = c[2] * dark;
      // The lights are the paper: the palest paint is barely there.
      d.data[i * 4 + 3] = Math.round(255 * (1 - smooth(0.72, 0.93, (c[0] + c[1] + c[2]) / 765)));
    }
  bx.putImageData(d, 0, 0);
  // Drawn up, softly: shapes with soft, not pixel, edges.
  const out = document.createElement('canvas');
  out.width = OW;
  out.height = OH;
  const o = out.getContext('2d', { willReadFrequently: true })!;
  o.imageSmoothingQuality = 'high';
  o.drawImage(base, 0, 0, OW, OH);
  // Drawn up once more, blurred, over itself: the shapes' edges bleed a little, as wet edges do.
  const wet = document.createElement('canvas');
  wet.width = OW;
  wet.height = OH;
  const wx = wet.getContext('2d')!;
  wx.filter = 'blur(3px)';
  wx.drawImage(out, 0, 0);
  o.globalAlpha = 0.55;
  o.drawImage(wet, 0, 0);
  o.globalAlpha = 1;
  // The grain of the paper, and the fraying.
  const img = o.getImageData(0, 0, OW, OH);
  const px = img.data;
  const N = 9;
  const grid = Array.from({ length: N * N }, () => r());
  const noise = (u: number, v: number) => {
    const x = u * (N - 1);
    const y = v * (N - 1);
    const x0 = Math.min(N - 2, Math.floor(x));
    const y0 = Math.min(N - 2, Math.floor(y));
    const fx = x - x0;
    const fy = y - y0;
    const at = (a: number, b: number) => grid[b * N + a];
    return (at(x0, y0) * (1 - fx) + at(x0 + 1, y0) * fx) * (1 - fy) + (at(x0, y0 + 1) * (1 - fx) + at(x0 + 1, y0 + 1) * fx) * fy;
  };
  const face = photo.face;
  for (let y = 0; y < OH; y++)
    for (let x = 0; x < OW; x++) {
      const i = (y * OW + x) * 4;
      const u = x / OW;
      const v = y / OH;
      const n = noise(u, v) - 0.5;
      const fray = smooth(0.01, 0.2, Math.min(u, 1 - u) + n * 0.18) * smooth(0.01, 0.16, Math.min(v, 1 - v) + n * 0.14) * smooth(0, 0.05, Math.min(u, 1 - u, v, 1 - v));
      // Grain: pigment settles in the paper's pits — a fine speckle, lighter over the face.
      const inFace = u > face.u && u < face.u + face.w && v > face.v && v < face.v + face.h;
      const grain = 1 - r() * (inFace ? 0.12 : 0.3);
      px[i + 3] = px[i + 3] * fray * grain;
    }
  o.putImageData(img, 0, 0);
  return out;
}

/** One wash of a picture: a wandering blob, glazed, that lets the pigment through. */
class Glaze implements Glazed {
  readonly layers: number;
  private base: Pt[];
  constructor(
    readonly cx: number,
    readonly cy: number,
    private rad: number,
    private fill: CanvasPattern,
    private alpha: number,
    layers: number,
    private rimmed: boolean,
    private r: Rng,
  ) {
    this.layers = layers;
    const n = 11;
    const turn = r() * Math.PI * 2;
    this.base = Array.from({ length: n }, (_, k) => {
      const a = turn + (k / n) * Math.PI * 2;
      const q = rad * (0.75 + r() * 0.45);
      return [cx + Math.cos(a) * q, cy + Math.sin(a) * q * 0.92] as Pt;
    });
  }

  pass(ctx: CanvasRenderingContext2D, i: number) {
    const r = this.r;
    const j = this.rad * 0.18;
    const p = this.base.map(([x, y]) => [x + gauss(r) * j, y + gauss(r) * j] as Pt);
    ctx.beginPath();
    // Through the midpoints, so the blob is round-shouldered, not a polygon.
    const mid = (a: Pt, b: Pt): Pt => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    const m0 = mid(p[p.length - 1], p[0]);
    ctx.moveTo(m0[0], m0[1]);
    for (let k = 0; k < p.length; k++) {
      const m = mid(p[k], p[(k + 1) % p.length]);
      ctx.quadraticCurveTo(p[k][0], p[k][1], m[0], m[1]);
    }
    ctx.closePath();
    ctx.fillStyle = this.fill;
    ctx.globalAlpha = this.alpha * (0.8 + r() * 0.4);
    ctx.fill();
    // The drying edge: the pigment that ran to the rim, in its own colour.
    if (this.rimmed && i === this.layers - 1) {
      ctx.globalAlpha = 0.12;
      ctx.strokeStyle = this.fill;
      ctx.lineWidth = Math.max(0.8, this.rad * 0.05);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
}
