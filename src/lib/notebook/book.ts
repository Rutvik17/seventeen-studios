/**
 * THE NOTEBOOK — a watercolour sketchbook, turned by scrolling.
 *
 * A hardback sketchbook lies on the sheet: indigo boards, a cream label with
 * "notebook" written on it, an elastic band. It is sketched and painted as the
 * page opens, like everything else on the site. Scroll, and the cover swings
 * open; scroll on, and the pages turn — each one lifting from the right,
 * bending, shading as it rises, and settling on the left — and every spread
 * after the contents is one entry: its title page on the left, written by
 * hand, its painting on the right, painted as the spread arrives.
 *
 * ---
 *
 * HOW IT IS BUILT
 *
 * Every face of every leaf is its own canvas, painted once (the drawings a
 * glaze at a time, as they come into view). A frame is those faces laid down
 * where they are: the leaves already turned on the left, the next one on the
 * right, and the one turning drawn in forty upright strips, each strip placed
 * where that part of the page is at this angle and a little taller the nearer
 * it comes — so the page appears to lift toward the reader and bend — with
 * shade laid over it as it rises.
 *
 * The leaves, in order:
 *
 *     0  front: the cover             back: the inside cover
 *     1  front: the contents          back: entry 1's title page
 *     2  front: entry 1's painting    back: entry 2's title page
 *     …
 *     n+1 front: entry n's painting   (back never seen)
 *
 * so there are n + 1 turns, and the book ends open on the last entry.
 */

import { clamp, easeInOut, rng, smooth } from '@/lib/film/random';
import { Wash, blob, type Pt } from '@/lib/film/wash';
import { pencil, drawStroke } from '@/lib/film/pencil';
import { Progressive } from '@/lib/film/progressive';
import { earth, type Drawing } from './globe';

export interface BookEntry {
  slug: string;
  title: string;
  date: string;
  summary: string;
}

export interface BookCopy {
  cover: string;
  owner: string;
  inside: string;
  contents: string;
  read: string;
}

/** The painting for each entry, in a page of the given size. */
const DRAWINGS: Record<string, (w: number, h: number) => Drawing> = {
  'earth-we-live-on': (w, h) => earth(w / 2, h * 0.46, Math.min(w, h) * 0.36),
};

const PAPER = '#fbf6ea';
const BOARD = '#2e3a6e';
const INK = '#1d1d21';

/** Page proportions, width over height. */
const ASPECT = 0.72;
/** Upright strips a turning page is drawn in. */
const STRIPS = 40;

interface Face {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  /** For a painted face: its layers, and the painting in progress. */
  paint?: { ink: HTMLCanvasElement; wash: HTMLCanvasElement; progressive: Progressive; started: number; base: HTMLCanvasElement };
}

export class Book {
  private ctx: CanvasRenderingContext2D;
  private W = 1;
  private H = 1;
  private dpr = 1;
  private pw = 1;
  private ph = 1;
  private faces: Face[][] = [];
  private turns: number;
  private turnP: number[];
  private coverIntro = 0;
  /** On a tall screen one page fills the width, and the camera moves between the two. */
  private portrait = false;
  /** Where the camera looks, relative to the spine, in page widths: +½ is the right page, −½ the left. */
  private look = 0.5;
  private hand: string;
  private write: string;

  constructor(
    private canvas: HTMLCanvasElement,
    private entries: BookEntry[],
    private copy: BookCopy,
    fonts: { hand: string; write: string },
  ) {
    this.ctx = canvas.getContext('2d')!;
    this.hand = fonts.hand;
    this.write = fonts.write;
    this.turns = entries.length + 1;
    this.turnP = Array.from({ length: this.turns }, () => 0);
    this.resize();
  }

  get turnCount() {
    return this.turns;
  }

  /* ---------------- size and faces ---------------- */

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.W = Math.max(1, Math.round(rect.width * this.dpr));
    this.H = Math.max(1, Math.round(rect.height * this.dpr));
    this.canvas.width = this.W;
    this.canvas.height = this.H;
    // The open spread fills the width it can, and leaves room above for the
    // header. On a tall, narrow screen a whole spread would be too small to
    // read, so one page fills the width instead.
    this.portrait = this.W / this.H < 0.9;
    this.ph = this.portrait ? Math.min(this.H * 0.72, (this.W * 0.86) / ASPECT) : Math.min(this.H * 0.76, (this.W * 0.94) / 2 / ASPECT);
    this.pw = this.ph * ASPECT;
    this.buildFaces();
  }

  private face(): Face {
    const canvas = document.createElement('canvas');
    canvas.width = Math.ceil(this.pw);
    canvas.height = Math.ceil(this.ph);
    return { canvas, ctx: canvas.getContext('2d')! };
  }

  private buildFaces() {
    const was = this.faces;
    const n = this.entries.length;
    const leaves: Face[][] = [];
    leaves.push([this.coverFace(), this.insideCoverFace()]);
    leaves.push([this.contentsFace(), this.titleFace(0)]);
    for (let i = 0; i < n; i++) leaves.push([this.drawingFace(i, was[i + 2]?.[0]?.paint?.progressive.progress ?? 0), i + 1 < n ? this.titleFace(i + 1) : this.plainFace()]);
    this.faces = leaves;
  }

  /** A sheet of the sketchbook's paper, with a faint tooth and a deckle of shade at the edges. */
  private paper(f: Face, seed: number) {
    const { ctx, canvas } = f;
    const r = rng(seed);
    ctx.fillStyle = PAPER;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.globalAlpha = 0.05;
    for (let k = 0; k < 900; k++) {
      ctx.fillStyle = r() < 0.5 ? '#b8ab8c' : '#ffffff';
      ctx.fillRect(r() * canvas.width, r() * canvas.height, 1.2 * this.dpr, 1.2 * this.dpr);
    }
    ctx.globalAlpha = 1;
    const g = ctx.createLinearGradient(0, 0, canvas.width, 0);
    g.addColorStop(0, 'rgba(120,100,70,0.08)');
    g.addColorStop(0.04, 'rgba(120,100,70,0)');
    g.addColorStop(0.96, 'rgba(120,100,70,0)');
    g.addColorStop(1, 'rgba(120,100,70,0.08)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  private text(f: Face, s: string, x: number, y: number, size: number, opts: { family?: 'hand' | 'write'; weight?: number; align?: CanvasTextAlign; colour?: string; underline?: boolean } = {}) {
    const { ctx } = f;
    const px = size * this.ph;
    ctx.font = `${opts.weight ?? 600} ${px}px ${opts.family === 'write' ? this.write : this.hand}`;
    ctx.textAlign = opts.align ?? 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = opts.colour ?? INK;
    const X = x * this.pw;
    const Y = y * this.ph;
    ctx.fillText(s, X, Y);
    if (opts.underline) {
      const w = ctx.measureText(s).width;
      const x0 = opts.align === 'center' ? X - w / 2 : opts.align === 'right' ? X - w : X;
      ctx.fillRect(x0, Y + px * 0.12, w, Math.max(1, px * 0.045));
    }
  }

  private wrap(f: Face, s: string, x: number, y: number, width: number, size: number, lead: number) {
    const { ctx } = f;
    ctx.font = `400 ${size * this.ph}px ${this.write}`;
    const words = s.split(' ');
    let line = '';
    let yy = y;
    for (const w of words) {
      const test = line ? `${line} ${w}` : w;
      if (ctx.measureText(test).width > width * this.pw && line) {
        this.text(f, line, x, yy, size, { family: 'write', weight: 400, colour: 'rgba(29,29,33,0.75)' });
        line = w;
        yy += lead;
      } else line = test;
    }
    if (line) this.text(f, line, x, yy, size, { family: 'write', weight: 400, colour: 'rgba(29,29,33,0.75)' });
  }

  private ruled(f: Face, from: number, to: number) {
    const { ctx } = f;
    ctx.fillStyle = 'rgba(80,110,160,0.13)';
    for (let y = from; y < to; y += 0.055) ctx.fillRect(this.pw * 0.08, y * this.ph, this.pw * 0.84, Math.max(1, this.dpr * 0.8));
  }

  private folio(f: Face, n: number, right: boolean) {
    this.text(f, String(n), right ? 0.9 : 0.1, 0.95, 0.03, { align: right ? 'right' : 'left', colour: 'rgba(29,29,33,0.5)' });
  }

  /** Paint washes and pencil into a face in its own page units. */
  private washOn(f: Face, draw: (paint: (pts: Pt[], colour: string, alpha: number, layers?: number, spread?: number) => void) => void, seed: number) {
    const r = rng(seed);
    const ctx = f.ctx;
    draw((pts, colour, alpha, layers = 12, spread = 0.1) => new Wash(pts, { color: colour, layers, alpha, spread, edge: 0.5, grain: Math.max(8, this.pw / 30) }, r).paint(ctx));
  }

  private coverFace(): Face {
    const f = this.face();
    const { ctx } = f;
    const w = this.pw;
    const h = this.ph;
    const r = rng(11);
    // Book cloth: an indigo board, painted wet, darker at its edges and at the spine.
    ctx.fillStyle = '#3a4679';
    ctx.fillRect(0, 0, w, h);
    this.washOn(f, (paint) => {
      paint([[0, 0], [w, 0], [w, h], [0, h]], BOARD, 0.12, 14, 0.04);
      paint([[0, 0], [w * 0.07, 0], [w * 0.07, h], [0, h]], '#1f2850', 0.14, 10, 0.04);
      for (let k = 0; k < 8; k++) paint(blob(r() * w, r() * h, w * 0.3, h * 0.12, r), '#4a5890', 0.05, 6, 0.3);
    }, 12);
    // The label.
    const lx = w * 0.2;
    const ly = h * 0.26;
    const lw = w * 0.62;
    const lh = h * 0.2;
    ctx.fillStyle = '#f3ead5';
    ctx.fillRect(lx, ly, lw, lh);
    ctx.strokeStyle = 'rgba(29,29,33,0.55)';
    ctx.lineWidth = Math.max(1, this.dpr);
    ctx.strokeRect(lx + 4 * this.dpr, ly + 4 * this.dpr, lw - 8 * this.dpr, lh - 8 * this.dpr);
    this.text(f, this.copy.cover, 0.51, 0.385, 0.075, { weight: 700, align: 'center', underline: true });
    this.text(f, this.copy.owner, 0.51, 0.43, 0.03, { weight: 600, align: 'center', colour: 'rgba(29,29,33,0.65)' });
    // The elastic band.
    ctx.fillStyle = 'rgba(20,20,28,0.55)';
    ctx.fillRect(w * 0.88, 0, w * 0.028, h);
    // Worn corners.
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    for (const [x, y] of [[w, 0], [w, h]] as const) {
      ctx.beginPath();
      ctx.arc(x, y, w * 0.05, 0, Math.PI * 2);
      ctx.fill();
    }
    return f;
  }

  private insideCoverFace(): Face {
    const f = this.face();
    const { ctx } = f;
    const w = this.pw;
    const h = this.ph;
    const r = rng(21);
    ctx.fillStyle = '#3a4679';
    ctx.fillRect(0, 0, w, h);
    // The pasted endpaper: pale, with loose marbling of blue and ochre.
    const m = w * 0.04;
    ctx.fillStyle = '#f4ecdc';
    ctx.fillRect(m, m, w - m * 2, h - m * 2);
    ctx.save();
    ctx.beginPath();
    ctx.rect(m, m, w - m * 2, h - m * 2);
    ctx.clip();
    this.washOn(f, (paint) => {
      for (let k = 0; k < 16; k++) paint(blob(m + r() * (w - 2 * m), m + r() * (h - 2 * m), w * 0.2, h * 0.06, r), k % 2 ? '#9fb6cf' : '#e3cc9c', 0.025, 12, 0.45);
    }, 22);
    ctx.restore();
    this.text(f, this.copy.inside, 0.5, 0.52, 0.06, { weight: 700, align: 'center' });
    this.text(f, this.copy.owner, 0.5, 0.58, 0.032, { weight: 600, align: 'center', colour: 'rgba(29,29,33,0.6)' });
    return f;
  }

  private contentsFace(): Face {
    const f = this.face();
    this.paper(f, 31);
    this.ruled(f, 0.24, 0.9);
    this.text(f, this.copy.contents, 0.1, 0.16, 0.07, { weight: 700, underline: true });
    this.entries.forEach((e, i) => {
      const y = 0.29 + i * 0.11;
      this.text(f, `${i + 1}`, 0.1, y, 0.045, { weight: 700, colour: '#2b3f9e' });
      this.text(f, e.title, 0.17, y, 0.045, { weight: 600 });
      this.text(f, e.date, 0.9, y, 0.03, { weight: 600, align: 'right', colour: 'rgba(29,29,33,0.55)' });
    });
    this.folio(f, 1, true);
    return f;
  }

  private titleFace(i: number): Face {
    const e = this.entries[i];
    const f = this.face();
    this.paper(f, 41 + i);
    this.ruled(f, 0.5, 0.9);
    this.text(f, e.date, 0.1, 0.2, 0.034, { weight: 600, colour: 'rgba(29,29,33,0.55)' });
    this.text(f, e.title, 0.1, 0.32, 0.085, { weight: 700 });
    this.wrap(f, e.summary, 0.1, 0.42, 0.8, 0.034, 0.055);
    this.text(f, this.copy.read, 0.1, 0.62, 0.045, { weight: 700, colour: '#2b3f9e', underline: true });
    this.folio(f, 2 + i * 2, false);
    return f;
  }

  private drawingFace(i: number, progress: number): Face {
    const e = this.entries[i];
    const f = this.face();
    const base = document.createElement('canvas');
    base.width = f.canvas.width;
    base.height = f.canvas.height;
    this.paper({ canvas: base, ctx: base.getContext('2d')! }, 51 + i);
    const ink = document.createElement('canvas');
    const wash = document.createElement('canvas');
    for (const c of [ink, wash]) {
      c.width = f.canvas.width;
      c.height = f.canvas.height;
    }
    const make = DRAWINGS[e.slug];
    const drawing = make ? make(this.pw, this.ph) : { ink: [], washes: [] };
    const progressive = new Progressive(drawing, ink.getContext('2d')!, wash.getContext('2d')!, { inkEnd: 0.4, paintStart: 0.3 });
    if (progress > 0) progressive.set(progress);
    f.paint = { ink, wash, progressive, started: progress >= 1 ? -1 : 0, base };
    this.composeDrawing(f, i);
    return f;
  }

  private composeDrawing(f: Face, i: number) {
    const p = f.paint!;
    const { ctx } = f;
    ctx.drawImage(p.base, 0, 0);
    ctx.drawImage(p.wash, 0, 0);
    ctx.drawImage(p.ink, 0, 0);
    this.text(f, this.entries[i].title, 0.5, 0.9, 0.034, { weight: 600, align: 'center', colour: 'rgba(29,29,33,0.6)' });
    this.folio(f, 3 + i * 2, true);
  }

  private plainFace(): Face {
    const f = this.face();
    this.paper(f, 99);
    return f;
  }

  /* ---------------- the story ---------------- */

  /** The cover being sketched and painted, 0–1, on entry. */
  setIntro(p: number) {
    this.coverIntro = clamp(p);
  }

  /**
   * How far through the book the scroll has got, 0–1.
   *
   * Each turn has a stretch of scroll to itself: a moment on the page about to
   * turn, the turn, a moment on the page just turned. On a tall screen the
   * camera spends the first moment moving across from the left page to the
   * right one, follows the leaf over, and at the very end moves across to the
   * last painting.
   */
  setScroll(p: number) {
    const tail = this.portrait ? 0.45 : 0.25;
    const u = p * (this.turns + tail);
    const k = Math.min(this.turns - 1, Math.floor(u));
    const s = u - k;
    for (let j = 0; j < this.turns; j++) this.turnP[j] = j < k ? 1 : j > k ? 0 : easeInOut(smooth(0.2, 0.8, s));
    if (!this.portrait) return;
    if (u >= this.turns) this.look = -0.5 + easeInOut(smooth(0, tail, u - this.turns));
    else if (s < 0.2) this.look = k === 0 ? 0.5 : -0.5 + easeInOut(s / 0.2);
    else this.look = 0.5 - this.turnP[k];
  }

  /** Turn straight to spread `s` (0 is the closed book). */
  setSpread(s: number) {
    for (let k = 0; k < this.turns; k++) this.turnP[k] = k < s ? 1 : 0;
    this.look = s === 0 ? 0.5 : -0.5;
  }

  /** On a tall screen, look at the left (−1) or right (+1) page of the open spread. */
  lookAt(side: -1 | 1) {
    this.look = side * 0.5;
  }

  get isPortrait() {
    return this.portrait;
  }

  /** The spread fully open, or -1 mid-turn. 0 is the closed book; entry i is spread i + 2. */
  get spread(): number {
    const turned = this.turnP.filter((t) => t >= 1).length;
    return this.turnP.some((t) => t > 0 && t < 1) ? -1 : turned;
  }

  /** The open spread's rectangle on screen, in CSS pixels. */
  get spreadRect() {
    const spine = this.spineX();
    const top = (this.H - this.ph) / 2 + this.H * 0.03;
    return { x: (spine - this.pw) / this.dpr, y: top / this.dpr, w: (this.pw * 2) / this.dpr, h: this.ph / this.dpr };
  }

  private spineX() {
    // On a tall screen the camera decides; otherwise, closed, the cover sits
    // in the middle, and open, the spine does.
    if (this.portrait) return this.W / 2 - this.pw * this.look;
    const open = this.turnP[0];
    return this.W / 2 - (this.pw / 2) * (1 - open);
  }

  /* ---------------- the frame ---------------- */

  render(now: number) {
    const { ctx, W, H, pw, ph } = this;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const spine = this.spineX();
    const top = (H - ph) / 2 + H * 0.03;

    // Paint each entry's drawing as its spread comes into view.
    this.faces.forEach((leaf, k) => {
      const p = leaf[0].paint;
      if (!p || p.started < 0) return;
      const revealing = this.turnP[k - 1] ?? 0;
      if (revealing > 0.35 && p.started === 0) p.started = now;
      if (p.started > 0) {
        p.progressive.set((now - p.started) / 2600);
        this.composeDrawing(leaf[0], k - 2);
        if (p.progressive.progress >= 1) p.started = -1;
      }
    });

    const intro = this.coverIntro;
    // The book's shadow on the sheet, and the boards under the pages.
    const open = this.turnP[0];
    const bx0 = spine - (open > 0 ? pw * open : 0) - pw * 0.03;
    const bx1 = spine + pw * 1.03;
    ctx.save();
    ctx.globalAlpha = smooth(0.5, 1, intro);
    ctx.shadowColor = 'rgba(40,30,20,0.28)';
    ctx.shadowBlur = 30 * this.dpr;
    ctx.shadowOffsetY = 10 * this.dpr;
    ctx.fillStyle = '#2b3664';
    ctx.fillRect(bx0, top - ph * 0.02, bx1 - bx0, ph * 1.04);
    ctx.restore();

    // Page edges, a stack under each side.
    const leftCount = this.turnP.filter((t) => t >= 1).length;
    ctx.globalAlpha = smooth(0.5, 1, intro);
    ctx.fillStyle = '#efe6d2';
    const edge = 4 * this.dpr;
    if (open > 0.5) ctx.fillRect(spine - pw - edge * Math.min(3, leftCount), top + edge, edge * Math.min(3, leftCount), ph - edge);
    ctx.fillRect(spine + pw, top + edge, edge * Math.min(3, this.turns - leftCount + 1), ph - edge);
    ctx.globalAlpha = 1;

    // The leaf lying on the left, and the one on the right — under a turning
    // leaf, the next one is already showing.
    const turned = this.turnP.filter((t) => t >= 1).length;
    const moving = this.turnP.findIndex((t) => t > 0 && t < 1);
    const leftLeaf = turned - 1;
    const rightLeaf = Math.min(this.faces.length - 1, moving >= 0 ? moving + 1 : turned);
    if (leftLeaf >= 0) ctx.drawImage(this.faces[leftLeaf][1].canvas, spine - pw, top, pw, ph);
    if (rightLeaf >= 0) {
      if (rightLeaf === 0) this.drawCover(spine, top, intro);
      else ctx.drawImage(this.faces[rightLeaf][0].canvas, spine, top, pw, ph);
    }

    // The gutter: shade into the spine on both sides.
    if (open > 0.02) {
      const g = ctx.createLinearGradient(spine - pw * 0.12, 0, spine + pw * 0.12, 0);
      g.addColorStop(0, 'rgba(60,45,25,0)');
      g.addColorStop(0.5, `rgba(60,45,25,${0.22 * open})`);
      g.addColorStop(1, 'rgba(60,45,25,0)');
      ctx.fillStyle = g;
      ctx.fillRect(spine - pw * 0.12, top, pw * 0.24, ph);
    }

    // The leaf turning.
    for (let k = this.turns - 1; k >= 0; k--) {
      const t = this.turnP[k];
      if (t <= 0 || t >= 1) continue;
      this.turning(k, t * Math.PI, spine, top);
    }
  }

  /** The cover, sketched then painted during the intro. */
  private drawCover(spine: number, top: number, intro: number) {
    const { ctx, pw, ph } = this;
    const face = this.faces[0][0].canvas;
    // The pencil outline of the book goes down first, then the paint washes across.
    const r = rng(7);
    if (intro < 1) {
      ctx.save();
      ctx.translate(spine, top);
      const outline = pencil([[0, 0], [pw, 0], [pw, ph], [0, ph], [0, 0]], r, { width: 1.4 * this.dpr, tone: 0.85, wobble: 1.5, overshoot: 6 * this.dpr });
      drawStroke(ctx, outline, 0, outline.length * smooth(0, 0.35, intro));
      const label = pencil([[pw * 0.2, ph * 0.26], [pw * 0.82, ph * 0.26], [pw * 0.82, ph * 0.46], [pw * 0.2, ph * 0.46], [pw * 0.2, ph * 0.26]], r, { width: 1 * this.dpr, tone: 0.7 });
      drawStroke(ctx, label, 0, label.length * smooth(0.2, 0.45, intro));
      ctx.restore();
    }
    const wet = smooth(0.35, 1, intro);
    if (wet > 0) {
      // The paint spreads down the board from the top, like a wash pulled with a wide brush.
      ctx.save();
      ctx.beginPath();
      ctx.rect(spine, top, pw, ph * Math.min(1, wet * 1.15));
      ctx.clip();
      ctx.globalAlpha = Math.min(1, wet * 1.6);
      ctx.drawImage(face, spine, top, pw, ph);
      ctx.restore();
    }
  }

  private turning(k: number, theta: number, spine: number, top: number) {
    const { ctx, pw, ph } = this;
    const front = theta < Math.PI / 2;
    const face = (front ? this.faces[k][0] : this.faces[k][1]).canvas;
    const sin = Math.sin(theta);
    // The page bends: the far part lags a little behind the part near the spine.
    const bend = (u: number) => theta + sin * 0.35 * u * u * (front ? -1 : 1);
    const xAt = (u: number) => spine + u * pw * Math.cos(bend(u));
    const liftAt = (u: number) => 1 + 0.1 * sin * u;

    // Its shadow on the page beneath, first.
    const tip = xAt(1);
    const g0 = ctx.createLinearGradient(tip, 0, tip + (front ? 1 : -1) * pw * 0.22, 0);
    g0.addColorStop(0, `rgba(40,30,20,${(0.2 * sin).toFixed(3)})`);
    g0.addColorStop(1, 'rgba(40,30,20,0)');
    ctx.fillStyle = g0;
    ctx.fillRect(front ? tip : tip - pw * 0.22, top, pw * 0.22, ph);

    // The page, in upright strips.
    const sw = face.width / STRIPS;
    for (let i = 0; i < STRIPS; i++) {
      const u0 = i / STRIPS;
      const u1 = (i + 1) / STRIPS;
      const x0 = xAt(u0);
      const x1 = xAt(u1);
      const h = ph * liftAt((u0 + u1) / 2);
      const sx = front ? i * sw : (STRIPS - 1 - i) * sw;
      ctx.drawImage(face, sx, 0, sw, face.height, Math.min(x0, x1) - 0.5, top - (h - ph) / 2, Math.abs(x1 - x0) + 1, h);
    }

    // Shade over the whole page at once: it darkens as it stands up, more toward its far edge.
    ctx.beginPath();
    for (let i = 0; i <= STRIPS; i++) {
      const u = i / STRIPS;
      ctx.lineTo(xAt(u), top - (ph * liftAt(u) - ph) / 2);
    }
    for (let i = STRIPS; i >= 0; i--) {
      const u = i / STRIPS;
      ctx.lineTo(xAt(u), top + ph + (ph * liftAt(u) - ph) / 2);
    }
    ctx.closePath();
    const g = ctx.createLinearGradient(spine, 0, tip, 0);
    const a = front ? 1 : 0.7;
    g.addColorStop(0, `rgba(40,30,20,${(0.06 * sin * a).toFixed(3)})`);
    g.addColorStop(1, `rgba(40,30,20,${(0.3 * sin * a).toFixed(3)})`);
    ctx.fillStyle = g;
    ctx.fill();
  }
}
