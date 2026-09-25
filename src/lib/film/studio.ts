/**
 * THE STUDIO — Seventeen's own house, in autumn.
 *
 * A small watercolour, drawn and painted the way the landing's film paints
 * Nvidia's campus: with the same pencil and the same wash. A gabled atelier
 * with a north-lit sawtooth wing (a row of triangles on its roof — the
 * campus's motif, at the scale of a house), a green door under a 17, a lamp
 * by the path, two maples turned orange and red, and their leaves coming
 * down.
 *
 * It is the loader — sketched and painted while the page gets ready — and,
 * finished and small, the mark in the header.
 *
 * The drawing is described once, in its own world of 600 × 400, as `ink`
 * (in the order the hand draws it) and `washes` (in the order a painter lays
 * them). `StudioPainting` shows it at any stage from blank to finished.
 */

import { between, clamp, pick, rng, smooth, type Rng } from './random';
import { blob, Wash, type Pt, type WashStyle } from './wash';
import { curve, drawStroke, pencil, pointAt, ruled, type Stroke } from './pencil';

export const STUDIO = { w: 600, h: 400 };
/** The part of the drawing the header's mark shows: the house and its nearer tree. */
export const MARK_CROP = { x: 22, y: 84, w: 560, h: 256 };
/** The loader's framing: the painting, with a little paper round it. */
export const LOADER_CROP = { x: 20, y: 60, w: 560, h: 310 };

const AUTUMN = ['#e08a2b', '#d4602a', '#eba42c', '#b8392c', '#c9772e'];

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

  /* ---- the ground, first as a wash, so everything stands on it ---- */
  paint([[40, 292], [560, 290], [575, 318], [520, 340], [300, 350], [80, 338], [30, 316]], { color: '#c7ae72', layers: 12, alpha: 0.07, spread: 0.22, edge: 0.3, grain: 20 });
  paint([[70, 300], [540, 298], [520, 326], [320, 334], [90, 326]], { color: '#9aa65a', layers: 10, alpha: 0.06, spread: 0.25, edge: 0.3 });

  /* ---- the house: a gabled atelier, a little turned so its side shows ---- */
  const front: Pt[] = [[220, G], [390, G], [390, 180], [305, 104], [220, 180]];
  const side: Pt[] = [[390, G], [452, G - 12], [452, 168], [390, 180]];
  const roofR: Pt[] = [[305, 104], [367, 92], [452, 168], [390, 180]];
  const eave = (a: Pt, b: Pt) => line(a, b, { width: 1.3, tone: 0.9 }, 0.5);
  eave([214, 184], [305, 100]);
  eave([305, 100], [396, 184]);
  eave([305, 100], [367, 88]);
  eave([367, 88], [458, 166]);
  eave([396, 184], [458, 166]);
  poly(front, { width: 1.1 });
  line([452, G - 12], [452, 168], { width: 1.1 }, 0);
  line([390, G], [452, G - 12], { width: 1.1 }, 0.3);
  // The chimney, brick, on the far slope.
  const chim: Pt[] = [[398, 128], [412, 125], [412, 104], [398, 107]];
  poly(chim, { width: 0.9 });
  // Roof courses, faint.
  for (let k = 1; k < 6; k++) {
    const t = k / 6;
    line([305 + (390 - 305) * t, 104 + (180 - 104) * t], [367 + (452 - 367) * t, 92 + (168 - 92) * t], { width: 0.5, tone: 0.3, overshoot: 0 }, 0);
  }
  // Windows: the big studio window, the door under its 17, a window beside it.
  const win = (x0: number, y0: number, x1: number, y1: number, cols: number, rows: number) => {
    poly([[x0, y0], [x1, y0], [x1, y1], [x0, y1]], { width: 0.9 });
    for (let c = 1; c < cols; c++) line([x0 + ((x1 - x0) * c) / cols, y0], [x0 + ((x1 - x0) * c) / cols, y1], { width: 0.5, tone: 0.5, overshoot: 0 }, 0);
    for (let q = 1; q < rows; q++) line([x0, y0 + ((y1 - y0) * q) / rows], [x1, y0 + ((y1 - y0) * q) / rows], { width: 0.5, tone: 0.5, overshoot: 0 }, 0);
    // The sill.
    line([x0 - 3, y1 + 2], [x1 + 3, y1 + 2], { width: 0.9 }, 0);
  };
  win(232, 206, 284, 278, 3, 3);
  win(340, 206, 376, 256, 2, 2);
  // A round window up in the gable.
  path(curve(Array.from({ length: 13 }, (_, k) => [305 + Math.cos((k / 12) * Math.PI * 2) * 13, 146 + Math.sin((k / 12) * Math.PI * 2) * 13] as Pt), 3), { width: 0.9, overshoot: 0 });
  line([292, 146], [318, 146], { width: 0.5, tone: 0.5, overshoot: 0 }, 0);
  line([305, 133], [305, 159], { width: 0.5, tone: 0.5, overshoot: 0 }, 0);
  // The door, and the number over it.
  poly([[296, 226], [322, 226], [322, G], [296, G]], { width: 1 });
  line([318, 262], [318, 266], { width: 1.2 }, 0);
  // Windows down the side, foreshortened.
  poly([[404, 214], [424, 210], [424, 252], [404, 256]], { width: 0.8 });
  poly([[430, 208], [444, 205], [444, 244], [430, 247]], { width: 0.8 });

  /* ---- the studio wing: glass below, a sawtooth of north lights above ---- */
  poly([[120, G], [220, G], [220, 226], [120, 226]], { width: 1 });
  const teeth: Pt[] = [[116, 226], [136, 198], [152, 226], [172, 198], [188, 226], [208, 198], [224, 226]];
  path(teeth, { width: 1.1, overshoot: 1 });
  for (let x = 136; x < 212; x += 36) line([x, 198], [x, 226], { width: 0.6, tone: 0.5, overshoot: 0 }, 0);
  for (let x = 128; x < 216; x += 18) line([x, 236], [x, 292], { width: 0.5, tone: 0.5, overshoot: 0 }, 0);
  line([124, 236], [216, 236], { width: 0.7 }, 0);
  line([124, 292], [216, 292], { width: 0.7 }, 0);

  /* ---- the path, the steps, the lamp ---- */
  path([[296, G], [274, 352]], { width: 0.8, tone: 0.6 });
  path([[322, G], [350, 352]], { width: 0.8, tone: 0.6 });
  for (let k = 1; k < 5; k++) {
    const t = k / 5;
    line([296 - 22 * t, G + 52 * t], [322 + 28 * t, G + 52 * t], { width: 0.5, tone: 0.35, overshoot: 0 }, 0);
  }
  path([[258, G + 6], [258, 238]], { width: 1, tone: 0.8, overshoot: 0 });
  poly([[252, 238], [264, 238], [262, 226], [254, 226]], { width: 0.8 });
  line([250, 226], [266, 226], { width: 0.8 }, 0);

  /* ---- washes: the house ---- */
  paint(front, { color: '#efdcbc', layers: 14, alpha: 0.085, spread: 0.08, edge: 0.5, grain: 12 });
  paint(side, { color: '#d9c19b', layers: 14, alpha: 0.09, spread: 0.08, edge: 0.5, grain: 12 });
  paint([[214, 184], [305, 100], [396, 184], [390, 180], [305, 110], [220, 180]], { color: '#4f5466', layers: 10, alpha: 0.1, spread: 0.06, edge: 0.4 });
  paint(roofR, { color: '#5d6172', layers: 14, alpha: 0.09, spread: 0.07, edge: 0.5, grain: 12 });
  paint(chim, { color: '#a8583f', layers: 8, alpha: 0.12, spread: 0.08 });
  paint([[232, 206], [284, 206], [284, 278], [232, 278]], { color: '#7f9db5', layers: 10, alpha: 0.1, spread: 0.08, edge: 0.4 });
  paint([[340, 206], [376, 206], [376, 256], [340, 256]], { color: '#7f9db5', layers: 10, alpha: 0.1, spread: 0.08, edge: 0.4 });
  paint(Array.from({ length: 10 }, (_, k) => [305 + Math.cos((k / 10) * Math.PI * 2) * 12, 146 + Math.sin((k / 10) * Math.PI * 2) * 12] as Pt), { color: '#6f8fa8', layers: 8, alpha: 0.12, spread: 0.08 });
  paint([[296, 226], [322, 226], [322, G], [296, G]], { color: '#2f5d50', layers: 12, alpha: 0.12, spread: 0.06, edge: 0.5 });
  paint([[404, 214], [424, 210], [424, 252], [404, 256]], { color: '#6f8fa8', layers: 8, alpha: 0.1, spread: 0.08 });
  paint([[430, 208], [444, 205], [444, 244], [430, 247]], { color: '#6f8fa8', layers: 8, alpha: 0.1, spread: 0.08 });
  paint([[120, G], [220, G], [220, 226], [120, 226]], { color: '#d6cbb8', layers: 12, alpha: 0.08, spread: 0.08, edge: 0.4 });
  paint([[124, 236], [216, 236], [216, 292], [124, 292]], { color: '#7392ac', layers: 10, alpha: 0.1, spread: 0.08, edge: 0.4 });
  for (let k = 0; k < 3; k++) paint([[116 + k * 36, 226], [136 + k * 36, 198], [136 + k * 36, 226]], { color: '#8aa8c0', layers: 6, alpha: 0.12, spread: 0.06 });
  for (let k = 0; k < 3; k++) paint([[136 + k * 36, 198], [152 + k * 36, 226], [136 + k * 36, 226]], { color: '#5d6172', layers: 6, alpha: 0.12, spread: 0.06 });
  paint([[296, G], [322, G], [350, 352], [274, 352]], { color: '#cfc6b6', layers: 10, alpha: 0.09, spread: 0.1, edge: 0.3 });
  paint([[252, 238], [264, 238], [262, 226], [254, 226]], { color: '#f2c46b', layers: 6, alpha: 0.16, spread: 0.1 });
  // Shade under the eaves and down the far side.
  paint([[220, 180], [305, 110], [390, 180], [390, 192], [305, 124], [220, 192]], { color: '#8a7a66', layers: 6, alpha: 0.07, spread: 0.1, edge: 0 });

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
  maple(92, 196, 72, 6);
  maple(508, 172, 62, -4);
  // Leaves already down, in drifts under the trees and along the path.
  for (let k = 0; k < 40; k++) {
    const x = k < 20 ? between(r, 40, 170) : between(r, 440, 570);
    const y = between(r, 298, 330);
    const s = between(r, 1.5, 3);
    paint(blob(x, y, s * 1.4, s * 0.7, r, 6), { color: pick(r, AUTUMN), layers: 3, alpha: 0.3, spread: 0.2, edge: 0 });
  }

  // Grass tufts, a few.
  for (let k = 0; k < 16; k++) {
    const x = between(r, 60, 560);
    if (x > 260 && x < 360) continue;
    const y = between(r, 304, 332);
    path([[x - 2, y], [x - 1, y - 5]], { width: 0.5, tone: 0.35, overshoot: 0 });
    path([[x + 1, y], [x + 2, y - 6]], { width: 0.5, tone: 0.35, overshoot: 0 });
  }

  // The number over the door is written last, in ink blue.
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
    // The 17 over the door, in the captions' hand, once the paint has reached it.
    const numberA = smooth(0.8, 0.95, this.progress);
    if (numberA > 0) {
      ctx.globalAlpha = numberA;
      ctx.fillStyle = '#2b3f9e';
      ctx.font = `700 19px ${this.numberFont}`;
      ctx.textAlign = 'center';
      ctx.fillText('17', 309, 221);
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
