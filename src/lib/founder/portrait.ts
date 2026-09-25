/**
 * THE PORTRAIT — Rutvik, sketched from his photograph and painted in.
 *
 * The photograph (`public/founder/rutvik-patel.jpg`: at a temple at night,
 * the temple lit white behind him, lotus lamps on the water, marigolds at his
 * side) is read in the browser, small, and turned into the two things every
 * painting on this site is made of:
 *
 * - **Pencil.** The contours are followed: wherever the brightness changes
 *   sharply the pencil runs along the edge, not across it, for as long as the
 *   edge lasts — the line of a jaw, a collar, a spire. Then shading: short
 *   diagonal hatching in the mid-darks (hair, the jacket's folds), never in
 *   the black of the night sky, which is left to the paint. The strokes are
 *   ordered from the face outward, so the drawing starts where a portraitist
 *   starts.
 * - **Watercolour.** The photograph is first turned into what a painter would
 *   put down: softened, its colours a little richer, its black night lifted
 *   into a deep indigo, a watercolour's night. Then
 *   it is laid in glazes, as a painter works: big loose washes first, then
 *   smaller ones over him and the temple, then fine ones over the face and
 *   the hands. Each glaze is a wandering blob that lets the picture through;
 *   where glazes overlap the colour builds up, and each dries with a darker
 *   rim. The sky thins out upward and the edges fray at random, so the
 *   painting ends in a ragged vignette on the white page.
 *
 * The lights in the photograph — the lamps on the water — are found by their
 * brightness and returned too, so the film can make them twinkle.
 */

import { between, rng, smooth } from '@/lib/film/random';
import { gauss, type Rng } from '@/lib/film/random';
import type { Glazed, Pt } from '@/lib/film/wash';
import { pencil, type Stroke } from '@/lib/film/pencil';

export interface Portrait {
  ink: Stroke[];
  washes: Glazed[];
  /** The photograph's bright lights, in world units, with their colour. */
  lights: { x: number; y: number; r: number; colour: string }[];
}

/** Analysis resolution: the photograph read at a quarter of its size. */
const AW = 270;
const AH = 360;
/** Where the face and the hands are in the photograph (1080 × 1440), for the fine pass. */
const FACE = { x: 415, y: 500, w: 260, h: 340 };
const HANDS = { x: 420, y: 1030, w: 160, h: 310 };

export function loadPhoto(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

export function portrait(img: HTMLImageElement, region: { x: number; y: number; w: number; h: number }, seed = 1702): Portrait {
  const r = rng(seed);
  const c = document.createElement('canvas');
  c.width = AW;
  c.height = AH;
  const cx = c.getContext('2d', { willReadFrequently: true })!;
  cx.drawImage(img, 0, 0, AW, AH);
  const px = cx.getImageData(0, 0, AW, AH).data;
  const at = (x: number, y: number) => (Math.min(AH - 1, Math.max(0, y)) * AW + Math.min(AW - 1, Math.max(0, x))) * 4;
  const lum = new Float32Array(AW * AH);
  for (let i = 0; i < AW * AH; i++) lum[i] = (0.299 * px[i * 4] + 0.587 * px[i * 4 + 1] + 0.114 * px[i * 4 + 2]) / 255;
  const L = (x: number, y: number) => lum[Math.min(AH - 1, Math.max(0, y)) * AW + Math.min(AW - 1, Math.max(0, x))];
  const k = region.w / AW;
  const W = (x: number, y: number): Pt => [region.x + x * k, region.y + y * k];
  const inBox = (x: number, y: number, b: typeof FACE) => x * 4 >= b.x && x * 4 <= b.x + b.w && y * 4 >= b.y && y * 4 <= b.y + b.h;
  const faceC = { x: (FACE.x + FACE.w / 2) / 4, y: (FACE.y + FACE.h / 2) / 4 };

  /* ---------------- the pencil ---------------- */

  // Brightness gradient (Sobel), on a lightly blurred picture.
  const blur = new Float32Array(AW * AH);
  for (let y = 0; y < AH; y++)
    for (let x = 0; x < AW; x++) {
      let s = 0;
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) s += L(x + dx, y + dy);
      blur[y * AW + x] = s / 25;
    }
  const B = (x: number, y: number) => blur[Math.min(AH - 1, Math.max(0, Math.round(y))) * AW + Math.min(AW - 1, Math.max(0, Math.round(x)))];
  const grad = (x: number, y: number) => {
    const gx = B(x + 1, y - 1) + 2 * B(x + 1, y) + B(x + 1, y + 1) - B(x - 1, y - 1) - 2 * B(x - 1, y) - B(x - 1, y + 1);
    const gy = B(x - 1, y + 1) + 2 * B(x, y + 1) + B(x + 1, y + 1) - B(x - 1, y - 1) - 2 * B(x, y - 1) - B(x + 1, y - 1);
    return [gx, gy, Math.hypot(gx, gy)] as const;
  };
  const strokes: { pts: Pt[]; d: number; tone: number; width: number }[] = [];
  const used = new Uint8Array(AW * AH);
  for (let y = 2; y < AH - 2; y += 2) {
    for (let x = 2; x < AW - 2; x += 2) {
      const fine = inBox(x, y, FACE) || inBox(x, y, HANDS);
      const [, , m] = grad(x, y);
      const thr = fine ? 0.2 : 0.36;
      if (m < thr || used[y * AW + x]) continue;
      // Follow the edge both ways, along the direction the brightness does not change.
      const run: Pt[] = [];
      for (const dir of [1, -1]) {
        let qx = x;
        let qy = y;
        const part: Pt[] = [];
        for (let s = 0; s < (fine ? 14 : 24); s++) {
          const [gx, gy, gm] = grad(qx, qy);
          if (gm < thr * 0.55) break;
          qx += (-gy / gm) * dir * 1.5;
          qy += (gx / gm) * dir * 1.5;
          const i = Math.round(qy) * AW + Math.round(qx);
          if (qx < 1 || qy < 1 || qx > AW - 2 || qy > AH - 2 || used[i]) break;
          used[i] = 1;
          part.push([qx, qy]);
        }
        if (dir === 1) run.push(...part.reverse(), [x, y]);
        else run.push(...part);
      }
      if (run.length < (fine ? 4 : 7)) continue;
      // Small closed loops are noise in the picture, not lines in it — a draughtsman would not draw them.
      const xs = run.map((q) => q[0]);
      const ys = run.map((q) => q[1]);
      const span = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
      if (span < (fine ? 3 : 8)) continue;
      const mid = run[Math.floor(run.length / 2)];
      strokes.push({ pts: run.map(([a, b]) => W(a, b)), d: Math.hypot(mid[0] - faceC.x, mid[1] - faceC.y), tone: fine ? 0.85 : Math.min(0.55, 0.25 + m * 0.45), width: fine ? 0.9 : 0.7 });
    }
  }
  // Hatching in the mid-darks: hair, the jacket, the shadows — not the night sky.
  for (let y = 3; y < AH - 3; y += 4) {
    for (let x = 3; x < AW - 3; x += 4) {
      const l = L(x, y);
      if (l < 0.1 || l > 0.42 || r() > 0.4) continue;
      const len = 5 + (0.42 - l) * 14;
      strokes.push({ pts: [W(x - len * 0.35, y + len * 0.35), W(x + len * 0.35, y - len * 0.35)], d: Math.hypot(x - faceC.x, y - faceC.y) + 20, tone: 0.18 + (0.42 - l) * 0.9, width: 0.6 });
    }
  }
  strokes.sort((a, b) => a.d - b.d);
  const ink = strokes.map((s) => pencil(s.pts, r, { width: s.width, tone: s.tone, wobble: 0.3, overshoot: s.pts.length > 2 ? 1.5 : 0.5 }));

  /* ---------------- the watercolour ---------------- */

  const pigment = toPigment(img);
  const pattern = document.createElement('canvas').getContext('2d')!.createPattern(pigment, 'no-repeat')!;
  const pk = region.w / pigment.width;
  pattern.setTransform(new DOMMatrix([pk, 0, 0, pk, region.x, region.y]));
  // How far out toward the frayed edge a point is: 0 inside, 1 past the rim.
  const rim = (u: number, v: number) => Math.max(Math.abs(u - 0.5) * 2, v < 0.3 ? (0.3 - v) * 3.2 : 0, (v - 0.5) * 2 * 0.98);
  const washes: Glazed[] = [];
  const pass = (step: number, rad: number, alpha: number, layers: number, rimmed: boolean, keep: (u: number, v: number) => boolean) => {
    const cells: [number, number][] = [];
    for (let y = step / 2; y < region.h; y += step)
      for (let x = step / 2; x < region.w; x += step) {
        const u = x / region.w;
        const v = y / region.h;
        if (!keep(u, v)) continue;
        const e = rim(u, v);
        if (e > 0.78 && r() < (e - 0.78) * 4.5) continue;
        cells.push([x + gauss(r) * step * 0.2, y + gauss(r) * step * 0.2]);
      }
    // A painter works a wash outward from where the picture is: the face first.
    const fx = (faceC.x * 4 * region.w) / 1080;
    const fy = (faceC.y * 4 * region.h) / 1440;
    cells.sort((p, q) => Math.hypot(p[0] - fx, p[1] - fy) - Math.hypot(q[0] - fx, q[1] - fy));
    for (const [x, y] of cells) washes.push(new Glaze(region.x + x, region.y + y, rad * between(r, 0.85, 1.2), pattern, alpha, layers, rimmed, r));
  };
  const inFace = (u: number, v: number) => u * 1080 > FACE.x - 20 && u * 1080 < FACE.x + FACE.w + 20 && v * 1440 > FACE.y - 30 && v * 1440 < FACE.y + FACE.h + 10;
  const inHands = (u: number, v: number) => u * 1080 > HANDS.x - 10 && u * 1080 < HANDS.x + HANDS.w + 10 && v * 1440 > HANDS.y && v * 1440 < HANDS.y + HANDS.h;
  pass(region.w / 10, region.w / 8, 0.09, 7, false, () => true);
  pass(region.w / 22, region.w / 16, 0.1, 5, true, (u, v) => (u > 0.14 && u < 0.86 && v > 0.33) || (u > 0.25 && u < 0.8 && v > 0.17));
  pass(region.w / 50, region.w / 34, 0.12, 5, true, (u, v) => inFace(u, v) || inHands(u, v));

  /* ---------------- the lights ---------------- */

  const lights: Portrait['lights'] = [];
  for (let y = Math.floor(AH * 0.5); y < AH - 2; y += 2) {
    for (let x = 2; x < AW - 2; x += 2) {
      if (inBox(x, y, FACE) || inBox(x, y, HANDS)) continue;
      const l = L(x, y);
      if (l < 0.72 || l < L(x - 2, y) || l < L(x + 2, y) || r() > 0.5) continue;
      const i = at(x, y);
      const [wx, wy] = W(x, y);
      lights.push({ x: wx, y: wy, r: k * 3.5, colour: `${px[i]},${px[i + 1]},${px[i + 2]}` });
      if (lights.length > 90) break;
    }
  }
  return { ink, washes, lights };
}

/**
 * The photograph as pigment: softened, richer, its darks lifted into indigo,
 * and frayed at its edges. Laid in thin glazes over the paper it gives back
 * the picture, lighter where the glazes are few, as a watercolour is.
 */
function toPigment(img: HTMLImageElement): HTMLCanvasElement {
  // Read small and drawn back up: the smoothing is the softening.
  const sw = 360;
  const sh = 480;
  const small = document.createElement('canvas');
  small.width = sw;
  small.height = sh;
  small.getContext('2d')!.drawImage(img, 0, 0, sw, sh);
  const W = 540;
  const H = 720;
  const out = document.createElement('canvas');
  out.width = W;
  out.height = H;
  const o = out.getContext('2d', { willReadFrequently: true })!;
  o.imageSmoothingQuality = 'high';
  o.drawImage(small, 0, 0, W, H);
  const d = o.getImageData(0, 0, W, H);
  const px = d.data;
  // The vignette: the sky thins out upward and the sides and foot fray, raggedly.
  const nr = rng(911);
  const N = 9;
  const grid = Array.from({ length: N * N }, () => nr());
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
  const fray = (x: number, y: number) => {
    const u = x / W;
    const v = y / H;
    const n = noise(u, v) - 0.5;
    return smooth(0.02, 0.36, v + n * 0.16) * smooth(0, 0.13, Math.min(u, 1 - u) + n * 0.07) * smooth(0, 0.09, 1 - v + n * 0.05);
  };
  const INDIGO = [58, 70, 120];
  for (let i = 0; i < px.length; i += 4) {
    let R = px[i];
    let G = px[i + 1];
    let B = px[i + 2];
    const m = (R + G + B) / 3;
    // Richer, as pigment is.
    R = m + (R - m) * 1.12;
    G = m + (G - m) * 1.12;
    B = m + (B - m) * 1.12;
    // The night is never black in a watercolour: the darks go to a deep indigo.
    const dark = Math.max(0, 1 - m / 110) * 0.85;
    R = R * (1 - dark) + INDIGO[0] * dark;
    G = G * (1 - dark) + INDIGO[1] * dark;
    B = B * (1 - dark) + INDIGO[2] * dark;
    // Lift everything a little toward the paper: a painting is lighter than a photograph.
    R = 24 + R * 0.9;
    G = 24 + G * 0.9;
    B = 24 + B * 0.9;
    // The paper shows through where the glazes are thin, so the pigment is the colour itself; only the vignette makes it fade.
    const q = i / 4;
    px[i] = Math.max(0, Math.min(255, Math.round(R)));
    px[i + 1] = Math.max(0, Math.min(255, Math.round(G)));
    px[i + 2] = Math.max(0, Math.min(255, Math.round(B)));
    const a = fray(q % W, Math.floor(q / W));
    px[i + 3] = Math.round(a * 255);
  }
  o.putImageData(d, 0, 0);
  return out;
}

/** One wash of the photograph: a wandering blob, glazed, that lets the pigment through. */
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
      const q = rad * (0.78 + r() * 0.38);
      return [cx + Math.cos(a) * q, cy + Math.sin(a) * q * 0.92] as Pt;
    });
  }

  pass(ctx: CanvasRenderingContext2D, i: number) {
    const r = this.r;
    const j = this.rad * 0.16;
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
      ctx.globalAlpha = 0.1;
      ctx.strokeStyle = this.fill;
      ctx.lineWidth = Math.max(0.8, this.rad * 0.05);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
}
