/**
 * THE STUDIO — Seventeen's headquarters, in autumn.
 *
 * A small watercolour, drawn and painted the way the landing's film paints
 * Nvidia's campus: with the same pencil and the same wash. A piece of modern
 * architecture, not a house: a long glass pavilion on the ground, and above
 * it a white box that cantilevers far out past the glass, faced in slim
 * timber fins, resting at its free end on a single V-shaped column. A row of
 * triangular north lights rides the roof — the campus's motif again. A
 * reflecting pool runs along the front; two maples, orange and red, drop
 * their leaves around it.
 *
 * It is the loader — sketched and painted while the page gets ready.
 *
 * The drawing is described once, in its own world of 600 × 400, as `ink`
 * (in the order the hand draws it) and `washes` (in the order a painter lays
 * them). `StudioPainting` shows it at any stage from blank to finished.
 */

import { between, clamp, pick, rng, smooth, type Rng } from './random';
import { blob, Wash, type Pt, type WashStyle } from './wash';
import { curve, drawStroke, pencil, pointAt, ruled, type Stroke } from './pencil';

export const STUDIO = { w: 600, h: 400 };
/** A tight framing of the building and its maples. */
export const MARK_CROP = { x: 22, y: 84, w: 560, h: 256 };
/** The loader's framing: the painting, with a little paper round it. */
export const LOADER_CROP = { x: 20, y: 70, w: 560, h: 300 };

const AUTUMN = ['#e08a2b', '#d4602a', '#eba42c', '#b8392c', '#c9772e'];
/** Where the number is written on the building, and how big, in the drawing's units. */
const SIGN = { x: 202, y: 206, size: 24 };

interface Drawing {
  ink: Stroke[];
  washes: Wash[];
  crowns: { cx: number; cy: number; r: number; base: number }[];
}

function draw(seed = 1717): Drawing {
  const r = rng(seed);
  const ink: Stroke[] = [];
  const washes: Wash[] = [];
  const crowns: Drawing['crowns'] = [];
  type Style = Parameters<typeof pencil>[2];
  const line = (a: Pt, b: Pt, style?: Style, twice = 0.3) => ink.push(...ruled(a, b, r, style, twice));
  const path = (pts: Pt[], style?: Style) => ink.push(pencil(pts, r, style));
  const poly = (pts: Pt[], style?: Style) => {
    for (let i = 0; i < pts.length; i++) line(pts[i], pts[(i + 1) % pts.length], style, 0.25);
  };
  const paint = (pts: Pt[], style: WashStyle) => washes.push(new Wash(pts, style, r));

  const G = 300;
  // The building is seen a little from the right: fronts are true, the right
  // end recedes up and to the right.
  const DX = 34;
  const DY = -12;

  /* ---- the ground and the pool ---- */
  paint([[40, 292], [560, 290], [575, 320], [520, 344], [300, 352], [80, 340], [30, 318]], { color: '#c7ae72', layers: 12, alpha: 0.07, spread: 0.22, edge: 0.3, grain: 20 });
  paint([[70, 300], [540, 298], [520, 330], [320, 338], [90, 330]], { color: '#9aa65a', layers: 10, alpha: 0.06, spread: 0.25, edge: 0.3 });
  const pool: Pt[] = [[150, 308], [470, 308], [478, 324], [142, 324]];
  paint(pool, { color: '#6f9bb8', layers: 12, alpha: 0.09, spread: 0.06, edge: 0.6, grain: 14 });
  poly(pool, { width: 0.8, tone: 0.6 });

  /* ---- the glass pavilion on the ground ---- */
  const gl: Pt[] = [[236, G], [450, G], [450, 224], [236, 224]];
  poly(gl, { width: 1.1 });
  line([450, G], [450 + DX, G + DY], { width: 1 }, 0);
  line([450 + DX, G + DY], [450 + DX, 224 + DY], { width: 1 }, 0);
  for (let x = 236 + 26; x < 450; x += 26) line([x, 224], [x, G], { width: 0.5, tone: 0.45, overshoot: 0 }, 0);
  line([236, 262], [450, 262], { width: 0.45, tone: 0.3, overshoot: 0 }, 0);
  // The door, a taller pane with a pull.
  poly([[340, 236], [366, 236], [366, G], [340, G]], { width: 0.9 });
  line([361, 262], [361, 276], { width: 1.2 }, 0);

  /* ---- the cantilevered box above, faced in timber fins ---- */
  const box: Pt[] = [[132, 222], [476, 222], [476, 164], [132, 164]];
  poly(box, { width: 1.3, tone: 0.9 });
  line([476, 222], [476 + DX, 222 + DY], { width: 1.2 }, 0.3);
  line([476, 164], [476 + DX, 164 + DY], { width: 1.2 }, 0.3);
  line([476 + DX, 164 + DY], [476 + DX, 222 + DY], { width: 1.2 }, 0);
  line([132, 164], [132 + DX, 164 + DY], { width: 1, tone: 0.7 }, 0);
  line([132 + DX, 164 + DY], [476 + DX, 164 + DY], { width: 1, tone: 0.7 }, 0);
  for (let x = 250; x < 470; x += 9) line([x, 170], [x, 216], { width: 0.45, tone: 0.4, overshoot: 0, wobble: 0.2 }, 0);
  // A long ribbon window across the cantilever.
  poly([[146, 182], [194, 182], [194, 204], [146, 204]], { width: 0.8 });
  // The V column under the free end.
  path([[170, G], [150, 222]], { width: 1, overshoot: 0 });
  path([[170, G], [190, 222]], { width: 1, overshoot: 0 });

  /* ---- north lights on the roof: a row of triangles ---- */
  const lights: Pt[][] = [];
  for (let k = 0; k < 6; k++) {
    const x0 = 262 + k * 34;
    const tri: Pt[] = [[x0, 164 + DY * 0.4], [x0 + 16, 140 + DY * 0.4], [x0 + 30, 164 + DY * 0.4]];
    lights.push(tri);
    path([...tri], { width: 0.9, overshoot: 0.5 });
  }

  /* ---- washes: the building ---- */
  paint(box, { color: '#ece6da', layers: 12, alpha: 0.1, spread: 0.06, edge: 0.4, grain: 12 });
  paint([[250, 170], [470, 170], [470, 216], [250, 216]], { color: '#b88455', layers: 12, alpha: 0.08, spread: 0.06, edge: 0.4 });
  paint([[476, 222], [476 + DX, 222 + DY], [476 + DX, 164 + DY], [476, 164]], { color: '#c9bfae', layers: 10, alpha: 0.1, spread: 0.06, edge: 0.4 });
  paint([[132, 164], [476, 164], [476 + DX, 164 + DY], [132 + DX, 164 + DY]], { color: '#d8d1c3', layers: 8, alpha: 0.1, spread: 0.06 });
  paint([[146, 182], [194, 182], [194, 204], [146, 204]], { color: '#5f7d98', layers: 10, alpha: 0.12, spread: 0.06 });
  paint(gl, { color: '#46607a', layers: 14, alpha: 0.09, spread: 0.06, edge: 0.5, grain: 12 });
  paint([[450, G], [450 + DX, G + DY], [450 + DX, 224 + DY], [450, 224]], { color: '#39506a', layers: 10, alpha: 0.1, spread: 0.06 });
  // Warm light inside, and the sky in the glass.
  paint([[270, 244], [330, 244], [330, 290], [270, 290]], { color: '#f0c173', layers: 8, alpha: 0.1, spread: 0.2, edge: 0 });
  paint([[380, 232], [412, 232], [396, 296], [364, 296]], { color: '#c7d8e6', layers: 5, alpha: 0.12, spread: 0.1, edge: 0 });
  for (const tri of lights) paint(tri, { color: '#8aa8c0', layers: 6, alpha: 0.14, spread: 0.06 });
  // The shadow the cantilever throws on the ground and the glass.
  paint([[140, 292], [236, 290], [236, 304], [150, 306]], { color: '#6d6a72', layers: 6, alpha: 0.05, spread: 0.2, edge: 0 });
  paint([[236, 224], [450, 224], [450, 232], [236, 232]], { color: '#2f3d4e', layers: 6, alpha: 0.1, spread: 0.08 });

  /* ---- the maples ---- */
  const maple = (x: number, h: number, rad: number, lean: number) => {
    const top: Pt = [x + lean, G - h];
    path(curve([[x - 4, G + 2], [x - 2 + lean * 0.3, G - h * 0.5], [top[0] - 2, top[1] + h * 0.35]], 5), { width: 1, tone: 0.8 });
    path(curve([[x + 4, G + 2], [x + 3 + lean * 0.3, G - h * 0.5], [top[0] + 2, top[1] + h * 0.35]], 5), { width: 1, tone: 0.8 });
    const fork: Pt = [top[0], top[1] + h * 0.35];
    const grow = (from: Pt, a: number, len: number, d: number) => {
      const to: Pt = [from[0] + Math.cos(a) * len, from[1] + Math.sin(a) * len];
      path([from, to], { width: 0.4 + d * 0.3, tone: 0.55 + d * 0.1, overshoot: 0 });
      if (d > 0) for (let k = 0; k < 2; k++) grow(to, a + between(r, -0.55, 0.55), len * between(r, 0.55, 0.75), d - 1);
    };
    for (let k = 0; k < 4; k++) grow(fork, -Math.PI / 2 + (k / 3 - 0.5) * 1.8, h * between(r, 0.2, 0.28), 2);
    const cy = G - h * 0.72;
    crowns.push({ cx: top[0], cy, r: rad, base: G });
    washes.push(new Wash([[x - 4, G], [x + 4, G], [fork[0] + 2, fork[1]], [fork[0] - 2, fork[1]]], { color: '#6d5a4a', layers: 6, alpha: 0.14, spread: 0.06 }, r));
    for (let k = 0; k < 12; k++) {
      const a = r() * Math.PI * 2;
      const d = Math.sqrt(r()) * rad * 0.6;
      const cx = top[0] + Math.cos(a) * d;
      const cyy = cy + Math.sin(a) * d * 0.8;
      const shade = cyy > cy && cx > top[0] - rad * 0.2;
      paint(blob(cx, cyy, rad * between(r, 0.3, 0.46), rad * between(r, 0.26, 0.4), r), { color: shade ? pick(r, ['#b8392c', '#c9772e', '#d4602a']) : pick(r, AUTUMN), layers: 12, alpha: 0.08, spread: 0.32, edge: 0.55 });
    }
    for (let k = 0; k < 10; k++) {
      const a = r() * Math.PI * 2;
      const d = rad * between(r, 0.8, 1.2);
      const s = between(r, 1.2, 3);
      paint(blob(top[0] + Math.cos(a) * d, cy + Math.sin(a) * d * 0.85, s, s, r, 6), { color: pick(r, AUTUMN), layers: 3, alpha: 0.3, spread: 0.2, edge: 0 });
    }
  };
  maple(84, 196, 70, 6);
  maple(532, 170, 60, -4);
  // Leaves already down, in drifts under the trees and floating on the pool.
  for (let k = 0; k < 44; k++) {
    const x = k < 18 ? between(r, 40, 150) : k < 36 ? between(r, 470, 575) : between(r, 160, 460);
    const y = k < 36 ? between(r, 298, 334) : between(r, 311, 321);
    const sz = between(r, 1.5, 3);
    paint(blob(x, y, sz * 1.4, sz * 0.7, r, 6), { color: pick(r, AUTUMN), layers: 3, alpha: 0.3, spread: 0.2, edge: 0 });
  }
  // Grasses in a planted strip along the glass.
  for (let k = 0; k < 22; k++) {
    const x = between(r, 60, 580);
    if (x > 140 && x < 480) continue;
    const y = between(r, 304, 336);
    path([[x - 2, y], [x - 1, y - 6]], { width: 0.5, tone: 0.35, overshoot: 0 });
    path([[x + 1, y], [x + 3, y - 7]], { width: 0.5, tone: 0.35, overshoot: 0 });
  }
  return { ink, washes, crowns };
}

interface Leaf {
  x: number;
  y: number;
  vx: number;
  vy: number;
  spin: number;
  size: number;
  colour: string;
  floor: number;
  a: number;
}

/**
 * The studio, painted onto a canvas, at any stage. `setProgress(0…1)` moves
 * the drawing on (pencil for the first half, paint for the second); `tick`
 * animates the leaves. With `finished`, it paints the whole thing at once.
 */
export class StudioPainting {
  private ctx: CanvasRenderingContext2D;
  private d = draw();
  private ink: HTMLCanvasElement;
  private paint: HTMLCanvasElement;
  private inkDrawn = 0;
  private done: number[];
  private effort: number[];
  private total: number;
  private scale = 1;
  private crop: { x: number; y: number; w: number; h: number };
  private leaves: Leaf[] = [];
  private r: Rng = rng(99);
  private pencilAt: Pt | null = null;
  private progress = 0;
  private numberFont: string;

  constructor(private canvas: HTMLCanvasElement, opts: { crop?: typeof MARK_CROP; font?: string } = {}) {
    this.ctx = canvas.getContext('2d')!;
    this.crop = opts.crop ?? { x: 0, y: 0, w: STUDIO.w, h: STUDIO.h };
    this.numberFont = opts.font ?? 'cursive';
    this.ink = document.createElement('canvas');
    this.paint = document.createElement('canvas');
    this.done = this.d.washes.map(() => 0);
    this.effort = this.d.ink.map((s) => s.length + 14);
    this.total = this.effort.reduce((a, b) => a + b, 0);
    this.resize();
  }

  /** Match the canvas to its box and repaint whatever stage it had reached. */
  resize() {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = Math.max(1, Math.round(rect.width * dpr));
    const h = Math.max(1, Math.round(rect.height * dpr));
    this.canvas.width = w;
    this.canvas.height = h;
    this.scale = Math.min(w / this.crop.w, h / this.crop.h);
    for (const c of [this.ink, this.paint]) {
      c.width = w;
      c.height = h;
    }
    const ox = (w - this.crop.w * this.scale) / 2 - this.crop.x * this.scale;
    const oy = (h - this.crop.h * this.scale) / 2 - this.crop.y * this.scale;
    for (const c of [this.ink, this.paint]) c.getContext('2d')!.setTransform(this.scale, 0, 0, this.scale, ox, oy);
    this.inkDrawn = 0;
    this.done = this.d.washes.map(() => 0);
    const p = this.progress;
    this.progress = 0;
    this.setProgress(p);
  }

  setProgress(p: number) {
    this.progress = Math.max(this.progress, clamp(p));
    const q = this.progress;
    // The pencil over the first 55%, the brush from 40% to the end.
    const inkTarget = this.total * smooth(0, 0.55, q);
    this.drawInk(inkTarget);
    const paint = clamp((q - 0.4) / 0.6);
    const l = this.paint.getContext('2d')!;
    const n = this.d.washes.length;
    this.d.washes.forEach((w, k) => {
      const start = (k / n) * 0.85;
      const due = Math.floor(clamp((paint - start) / 0.15) * w.layers);
      while (this.done[k] < due) w.pass(l, this.done[k]++);
    });
    if (q >= 1) this.pencilAt = null;
  }

  private drawInk(target: number) {
    const l = this.ink.getContext('2d')!;
    let acc = 0;
    this.pencilAt = null;
    for (let i = 0; i < this.d.ink.length; i++) {
      const s = this.d.ink[i];
      const a = acc;
      const b = acc + this.effort[i];
      acc = b;
      if (b <= this.inkDrawn) continue;
      if (a >= target) break;
      const from = Math.max(0, this.inkDrawn - a - 14);
      const to = Math.min(s.length, target - a - 14);
      if (to > from) drawStroke(l, s, from, to);
      if (target < b) this.pencilAt = pointAt(s, Math.max(0, to));
    }
    this.inkDrawn = Math.max(this.inkDrawn, target);
  }

  /** Draw a frame; `dt` in seconds moves the falling leaves. */
  render(dt = 0, leaves = true) {
    const { ctx, canvas } = this;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(this.paint, 0, 0);
    ctx.drawImage(this.ink, 0, 0);
    const ox = (canvas.width - this.crop.w * this.scale) / 2 - this.crop.x * this.scale;
    const oy = (canvas.height - this.crop.h * this.scale) / 2 - this.crop.y * this.scale;
    ctx.setTransform(this.scale, 0, 0, this.scale, ox, oy);
    // The number on the cantilever, in the captions' hand, once the paint has reached it.
    const numberA = smooth(0.8, 0.95, this.progress);
    if (numberA > 0) {
      ctx.globalAlpha = numberA;
      ctx.fillStyle = '#1d1d21';
      ctx.font = `700 ${SIGN.size}px ${this.numberFont}`;
      ctx.textAlign = 'left';
      ctx.fillText('17', SIGN.x, SIGN.y);
      ctx.globalAlpha = 1;
    }
    if (leaves) this.fall(dt);
    if (this.pencilAt && this.progress < 0.6) drawPencil(ctx, this.pencilAt[0], this.pencilAt[1]);
  }

  private fall(dt: number) {
    const r = this.r;
    const want = smooth(0.7, 1, this.progress) * 22;
    if (this.leaves.length < want && r() < dt * 8) {
      const c = pick(r, this.d.crowns);
      const a = r() * Math.PI * 2;
      const d = Math.sqrt(r()) * c.r * 0.8;
      this.leaves.push({ x: c.cx + Math.cos(a) * d, y: c.cy + Math.sin(a) * d * 0.7, vx: between(r, -6, 10), vy: between(r, 14, 26), spin: r() * 6, size: between(r, 2.4, 3.8), colour: pick(r, AUTUMN), floor: c.base + between(r, 2, 40), a: 0 });
    }
    const ctx = this.ctx;
    const wind = Math.sin(performance.now() / 2400) * 10;
    for (const l of this.leaves) {
      if (l.y < l.floor) {
        l.x += (l.vx + wind + Math.sin(l.spin) * 10) * dt;
        l.y += l.vy * dt;
        l.spin += dt * 2.4;
        l.a = Math.min(1, l.a + dt * 2);
      } else l.a -= dt * 0.35;
      ctx.globalAlpha = Math.max(0, l.a) * 0.9;
      ctx.fillStyle = l.colour;
      ctx.beginPath();
      ctx.ellipse(l.x, l.y, l.size, l.size * Math.abs(Math.cos(l.spin)) * 0.55 + 0.4, l.spin, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    this.leaves = this.leaves.filter((l) => l.a > 0 || l.y < l.floor);
  }
}

function drawPencil(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-0.7);
  ctx.fillStyle = '#2b2a30';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(4, -2);
  ctx.lineTo(4, 2);
  ctx.fill();
  ctx.fillStyle = '#e9c9a0';
  ctx.beginPath();
  ctx.moveTo(4, -2);
  ctx.lineTo(14, -4.5);
  ctx.lineTo(14, 4.5);
  ctx.lineTo(4, 2);
  ctx.fill();
  ctx.fillStyle = '#e5b43a';
  ctx.fillRect(14, -4.5, 64, 9);
  ctx.fillStyle = '#b8b8b0';
  ctx.fillRect(78, -4.5, 7, 9);
  ctx.fillStyle = '#e48a8a';
  ctx.fillRect(85, -4.5, 8, 9);
  ctx.restore();
}
