/**
 * THE NOTEBOOK — a watercolour sketchbook, turned by scrolling.
 *
 * Drawn after a real one: a tall black hardback, bound along its top edge,
 * with rounded corners and a black elastic band down its right side. Its
 * pages are heavy white cold-pressed paper with a strong tooth, and they turn
 * UP — over the top edge — so an open book shows the page just turned
 * standing above, and the painting lying below.
 *
 * It is sketched and painted as the page opens. Scroll, and the cover lifts
 * up and over onto the contents; scroll on, and each page lifts from its
 * bottom edge, rises, bends toward you, and folds over the top — and every
 * page after the contents is one entry: its painting, a loose ink-and-wash
 * vignette, with its title, date and a line about it written underneath.
 *
 * ---
 *
 * HOW IT IS BUILT
 *
 * Every face of every leaf is its own canvas, painted once (the paintings a
 * glaze at a time, as they come into view). A frame is those faces laid where
 * they are: the leaves already turned above the binding, the next one below,
 * and the one turning drawn in forty horizontal strips, each placed where that
 * part of the page is at this angle and a little wider the nearer it comes, so
 * the page lifts toward the reader and bends — with shade laid over it as it
 * stands up.
 *
 * The leaves, in order:
 *
 *     0   front: the cover            back: the inside of the cover
 *     1   front: the contents         back: blank paper
 *     i+2 front: entry i's painting   back: blank paper
 *
 * so there are n + 1 turns, and the book ends open on the last painting.
 */

import { clamp, easeInOut, rng, smooth } from '@/lib/film/random';
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

/** The painting for each entry, in the top of a page of the given size. */
const DRAWINGS: Record<string, (w: number, h: number) => Drawing> = {
  'earth-we-live-on': (w, h) => earth(w / 2, h * 0.38, Math.min(w * 0.36, h * 0.25)),
};

const PAPER = '#fbfaf6';
const BOARD = '#1d1d22';
const INK = '#1d1d21';

/** Page proportions, width over height: a tall sketchbook. */
const ASPECT = 0.66;
/** Horizontal strips a turning page is drawn in. */
const STRIPS = 40;

interface Face {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  paint?: { ink: HTMLCanvasElement; wash: HTMLCanvasElement; progressive: Progressive; started: number; base: HTMLCanvasElement };
}

export class Book {
  private ctx: CanvasRenderingContext2D;
  private W = 1;
  private H = 1;
  private dpr = 1;
  private pw = 1;
  private ph = 1;
  private radius = 1;
  private faces: Face[][] = [];
  private turns: number;
  private turnP: number[];
  private coverIntro = 0;
  private hand: string;

  constructor(
    private canvas: HTMLCanvasElement,
    private entries: BookEntry[],
    private copy: BookCopy,
    fonts: { hand: string; write?: string },
  ) {
    this.ctx = canvas.getContext('2d')!;
    this.hand = fonts.hand;
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
    // One page is most of the screen's height, or as wide as the screen allows.
    this.ph = Math.min(this.H * 0.64, (this.W * 0.88) / ASPECT);
    this.pw = this.ph * ASPECT;
    this.radius = this.pw * 0.035;
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
    leaves.push([this.contentsFace(), this.blankFace(61)]);
    for (let i = 0; i < n; i++) leaves.push([this.drawingFace(i, was[i + 2]?.[0]?.paint?.progressive.progress ?? 0), this.blankFace(71 + i)]);
    this.faces = leaves;
  }

  private rounded(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  /** Heavy white cold-pressed paper: its tooth, in light and shade, inside rounded corners. */
  private paper(f: Face, seed: number) {
    const { ctx, canvas } = f;
    const r = rng(seed);
    ctx.save();
    this.rounded(ctx, 0, 0, canvas.width, canvas.height, this.radius);
    ctx.clip();
    ctx.fillStyle = PAPER;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const dot = Math.max(1, this.dpr * 1.1);
    for (let k = 0; k < (canvas.width * canvas.height) / (70 * this.dpr * this.dpr); k++) {
      const x = r() * canvas.width;
      const y = r() * canvas.height;
      ctx.fillStyle = `rgba(120,110,95,${(0.03 + r() * 0.05).toFixed(3)})`;
      ctx.fillRect(x, y, dot * (1 + r()), dot);
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.fillRect(x - dot, y - dot, dot, dot);
    }
    ctx.restore();
  }

  private text(f: Face, s: string, x: number, y: number, size: number, opts: { weight?: number; align?: CanvasTextAlign; colour?: string; underline?: boolean } = {}) {
    const { ctx } = f;
    const px = size * this.ph;
    ctx.font = `${opts.weight ?? 600} ${px}px ${this.hand}`;
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

  private wrap(f: Face, s: string, x: number, y: number, width: number, size: number, lead: number, align: CanvasTextAlign = 'left') {
    const { ctx } = f;
    ctx.font = `500 ${size * this.ph}px ${this.hand}`;
    const lines: string[] = [];
    let line = '';
    for (const w of s.split(' ')) {
      const test = line ? `${line} ${w}` : w;
      if (ctx.measureText(test).width > width * this.pw && line) {
        lines.push(line);
        line = w;
      } else line = test;
    }
    if (line) lines.push(line);
    lines.forEach((l, k) => this.text(f, l, x, y + k * lead, size, { weight: 500, align, colour: 'rgba(29,29,33,0.72)' }));
    return y + (lines.length - 1) * lead;
  }

  private folio(f: Face, n: number) {
    this.text(f, String(n), 0.9, 0.96, 0.024, { align: 'right', colour: 'rgba(29,29,33,0.45)' });
  }

  private board(f: Face, seed: number) {
    const { ctx, canvas } = f;
    const r = rng(seed);
    ctx.save();
    this.rounded(ctx, 0, 0, canvas.width, canvas.height, this.radius * 1.4);
    ctx.clip();
    ctx.fillStyle = BOARD;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    // The grain of black book cloth, and a sheen where it catches the light.
    for (let k = 0; k < 1800; k++) {
      ctx.fillStyle = `rgba(255,255,255,${(r() * 0.035).toFixed(3)})`;
      ctx.fillRect(r() * canvas.width, r() * canvas.height, this.dpr * 1.5, this.dpr);
    }
    const g = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    g.addColorStop(0, 'rgba(255,255,255,0.06)');
    g.addColorStop(0.5, 'rgba(255,255,255,0)');
    g.addColorStop(1, 'rgba(0,0,0,0.12)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
  }

  private coverFace(): Face {
    const f = this.face();
    this.board(f, 11);
    const { ctx } = f;
    const w = this.pw;
    const h = this.ph;
    // A paper label, stuck on a little crooked, written on by hand.
    ctx.save();
    ctx.translate(w * 0.5, h * 0.36);
    ctx.rotate(-0.025);
    ctx.fillStyle = '#f6f3ec';
    ctx.fillRect(-w * 0.28, -h * 0.07, w * 0.56, h * 0.14);
    ctx.restore();
    this.text(f, this.copy.cover, 0.5, 0.365, 0.06, { weight: 700, align: 'center', underline: true });
    this.text(f, this.copy.owner, 0.5, 0.41, 0.026, { weight: 600, align: 'center', colour: 'rgba(29,29,33,0.65)' });
    return f;
  }

  private insideCoverFace(): Face {
    const f = this.face();
    this.board(f, 21);
    const { ctx } = f;
    const w = this.pw;
    const h = this.ph;
    // Seen from below as it stands over the binding: the inside of the board,
    // with the owner's name on a slip of paper.
    ctx.fillStyle = '#2a2a30';
    this.rounded(ctx, w * 0.03, h * 0.03, w * 0.94, h * 0.94, this.radius);
    ctx.fill();
    ctx.save();
    ctx.translate(w * 0.5, h * 0.72);
    ctx.rotate(0.02);
    ctx.fillStyle = '#f6f3ec';
    ctx.fillRect(-w * 0.3, -h * 0.06, w * 0.6, h * 0.12);
    ctx.restore();
    this.text(f, this.copy.inside, 0.5, 0.715, 0.04, { weight: 700, align: 'center' });
    this.text(f, this.copy.owner, 0.5, 0.755, 0.024, { weight: 600, align: 'center', colour: 'rgba(29,29,33,0.6)' });
    return f;
  }

  private contentsFace(): Face {
    const f = this.face();
    this.paper(f, 31);
    this.text(f, this.copy.contents, 0.12, 0.14, 0.06, { weight: 700, underline: true });
    this.entries.forEach((e, i) => {
      const y = 0.25 + i * 0.08;
      this.text(f, `${i + 1}`, 0.12, y, 0.036, { weight: 700 });
      this.text(f, e.title, 0.2, y, 0.036, { weight: 600 });
      this.text(f, e.date, 0.88, y, 0.024, { weight: 600, align: 'right', colour: 'rgba(29,29,33,0.55)' });
    });
    this.folio(f, 1);
    return f;
  }

  private blankFace(seed: number): Face {
    const f = this.face();
    this.paper(f, seed);
    return f;
  }

  private drawingFace(i: number, progress: number): Face {
    const f = this.face();
    const base = document.createElement('canvas');
    base.width = f.canvas.width;
    base.height = f.canvas.height;
    const baseFace = { canvas: base, ctx: base.getContext('2d')! };
    this.paper(baseFace, 51 + i);
    // What is written under the painting goes on the paper first, so the
    // painting and the pencil sit on the same sheet as the words.
    const e = this.entries[i];
    this.text(baseFace, e.title, 0.5, 0.74, 0.05, { weight: 700, align: 'center' });
    this.text(baseFace, e.date, 0.5, 0.785, 0.026, { weight: 600, align: 'center', colour: 'rgba(29,29,33,0.55)' });
    const end = this.wrap(baseFace, e.summary, 0.5, 0.83, 0.72, 0.03, 0.04, 'center');
    this.text(baseFace, this.copy.read, 0.5, end + 0.07, 0.034, { weight: 700, align: 'center', colour: '#1f3a8a', underline: true });
    this.folio(baseFace, 2 + i);

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
    this.composeDrawing(f);
    return f;
  }

  private composeDrawing(f: Face) {
    const p = f.paint!;
    const { ctx, canvas } = f;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(p.base, 0, 0);
    ctx.save();
    this.rounded(ctx, 0, 0, canvas.width, canvas.height, this.radius);
    ctx.clip();
    ctx.drawImage(p.wash, 0, 0);
    ctx.drawImage(p.ink, 0, 0);
    ctx.restore();
  }

  /* ---------------- the story ---------------- */

  setIntro(p: number) {
    this.coverIntro = clamp(p);
  }

  /** How far through the book the scroll has got, 0–1: a moment on each page, then its turn. */
  setScroll(p: number) {
    const u = p * (this.turns + 0.3);
    const k = Math.min(this.turns - 1, Math.floor(u));
    const s = u - k;
    for (let j = 0; j < this.turns; j++) this.turnP[j] = j < k ? 1 : j > k ? 0 : easeInOut(smooth(0.2, 0.85, s));
  }

  setSpread(s: number) {
    for (let k = 0; k < this.turns; k++) this.turnP[k] = k < s ? 1 : 0;
  }

  /** The spread fully open, or -1 mid-turn. 0 is the closed book; entry i is spread i + 2. */
  get spread(): number {
    const turned = this.turnP.filter((t) => t >= 1).length;
    return this.turnP.some((t) => t > 0 && t < 1) ? -1 : turned;
  }

  /** The lower page's rectangle on screen, in CSS pixels: where the open entry lies. */
  get spreadRect() {
    const { x, spine } = this.frame();
    return { x: x / this.dpr, y: spine / this.dpr, w: this.pw / this.dpr, h: this.ph / this.dpr };
  }

  /** Where the book lies: closed, the cover in the middle; open, the binding a third of the way down. */
  private frame() {
    const open = this.turnP[0];
    const closedSpine = (this.H - this.ph) / 2 + this.H * 0.02;
    const openSpine = Math.max(this.H * 0.3, this.H - this.ph - this.H * 0.05);
    return { x: (this.W - this.pw) / 2, spine: closedSpine + (openSpine - closedSpine) * easeInOut(open) };
  }

  /* ---------------- the frame ---------------- */

  render(now: number) {
    const { ctx, W, H, pw, ph } = this;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const { x, spine } = this.frame();

    // Paint each entry's picture as its page comes into view.
    this.faces.forEach((leaf, k) => {
      const p = leaf[0].paint;
      if (!p || p.started < 0) return;
      const revealing = this.turnP[k - 1] ?? 0;
      if (revealing > 0.3 && p.started === 0) p.started = now;
      if (p.started > 0) {
        p.progressive.set((now - p.started) / 2600);
        this.composeDrawing(leaf[0]);
        if (p.progressive.progress >= 1) p.started = -1;
      }
    });

    const intro = this.coverIntro;
    const shown = smooth(0.5, 1, intro);
    const open = this.turnP[0];
    const turned = this.turnP.filter((t) => t >= 1).length;
    const moving = this.turnP.findIndex((t) => t > 0 && t < 1);

    // The boards: the back board under the pages, and — once the cover is
    // over — the front board standing above the binding.
    const pad = pw * 0.025;
    ctx.save();
    ctx.globalAlpha = shown;
    ctx.shadowColor = 'rgba(30,25,20,0.3)';
    ctx.shadowBlur = 28 * this.dpr;
    ctx.shadowOffsetY = 10 * this.dpr;
    ctx.fillStyle = BOARD;
    this.rounded(ctx, x - pad, spine - pad * 0.4, pw + pad * 2, ph + pad * 1.6, this.radius * 1.6);
    ctx.fill();
    if (open > 0) {
      const up = ph * Math.min(1, open * 1.05);
      this.rounded(ctx, x - pad, spine - up - pad * 0.3, pw + pad * 2, up + pad * 0.3, this.radius * 1.6);
      ctx.fill();
    }
    ctx.restore();

    // The page edges, a stack under the lower page.
    ctx.globalAlpha = shown;
    ctx.fillStyle = '#e9e6de';
    const left = this.turns - turned;
    for (let k = Math.min(4, left); k > 0; k--) {
      this.rounded(ctx, x + k * this.dpr * 0.6, spine + k * this.dpr * 1.6, pw - k * this.dpr * 1.2, ph, this.radius);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // The leaf standing above the binding, and the one lying below it.
    const upper = turned - 1;
    const lower = Math.min(this.faces.length - 1, moving >= 0 ? moving + 1 : turned);
    if (upper >= 0) this.drawFlipped(this.faces[upper][1].canvas, x, spine);
    if (lower === 0) this.drawCover(x, spine, intro);
    else ctx.drawImage(this.faces[lower][0].canvas, x, spine, pw, ph);

    // The binding: a shadow along the top edge of the lower page.
    if (open > 0.02) {
      const g = ctx.createLinearGradient(0, spine, 0, spine + ph * 0.06);
      g.addColorStop(0, `rgba(40,30,20,${0.22 * open})`);
      g.addColorStop(1, 'rgba(40,30,20,0)');
      ctx.fillStyle = g;
      ctx.fillRect(x, spine, pw, ph * 0.06);
    }

    // The elastic band, down the right side over the boards.
    ctx.globalAlpha = shown;
    ctx.fillStyle = '#121216';
    const bw = pw * 0.045;
    const bx = x + pw + pad * 0.2;
    ctx.fillRect(bx, spine + ph * 0.25, bw, ph * 0.6);
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    ctx.fillRect(bx + bw * 0.2, spine + ph * 0.25, bw * 0.15, ph * 0.6);
    ctx.globalAlpha = 1;

    if (moving >= 0) this.turning(moving, this.turnP[moving] * Math.PI, x, spine);
  }

  /** A turned leaf's back, standing above the binding (seen upside down, so turned over). */
  private drawFlipped(face: HTMLCanvasElement, x: number, spine: number) {
    const { ctx, pw, ph } = this;
    ctx.save();
    ctx.translate(x, spine);
    ctx.scale(1, -1);
    ctx.drawImage(face, 0, 0, pw, ph);
    ctx.restore();
  }

  /** The cover, sketched then painted during the intro. */
  private drawCover(x: number, spine: number, intro: number) {
    const { ctx, pw, ph } = this;
    const face = this.faces[0][0].canvas;
    if (intro < 1) {
      const r = rng(7);
      ctx.save();
      ctx.translate(x, spine);
      const outline = pencil([[0, 0], [pw, 0], [pw, ph], [0, ph], [0, 0]], r, { width: 1.4 * this.dpr, tone: 0.85, wobble: 1.5, overshoot: 6 * this.dpr });
      drawStroke(ctx, outline, 0, outline.length * smooth(0, 0.35, intro));
      ctx.restore();
    }
    const wet = smooth(0.35, 1, intro);
    if (wet > 0) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(x, spine, pw, ph * Math.min(1, wet * 1.15));
      ctx.clip();
      ctx.globalAlpha = Math.min(1, wet * 1.6);
      ctx.drawImage(face, x, spine, pw, ph);
      ctx.restore();
    }
  }

  /**
   * A leaf turning up over the binding: angle 0 lies flat below, π stands
   * above. Drawn in horizontal strips from the binding out to its free edge.
   */
  private turning(k: number, theta: number, x: number, spine: number) {
    const { ctx, pw, ph } = this;
    const front = theta < Math.PI / 2;
    const face = (front ? this.faces[k][0] : this.faces[k][1]).canvas;
    const sin = Math.sin(theta);
    // The free edge lags a little: the page bends as it lifts.
    const bend = (v: number) => theta + sin * 0.35 * v * v * (front ? -1 : 1);
    const yAt = (v: number) => spine + v * ph * Math.cos(bend(v));
    const widen = (v: number) => 1 + 0.12 * sin * v;

    // Its shadow on the page beneath.
    const tip = yAt(1);
    const g0 = ctx.createLinearGradient(0, tip, 0, tip + (front ? 1 : -1) * ph * 0.18);
    g0.addColorStop(0, `rgba(40,30,20,${(0.22 * sin).toFixed(3)})`);
    g0.addColorStop(1, 'rgba(40,30,20,0)');
    ctx.fillStyle = g0;
    ctx.fillRect(x, front ? tip : tip - ph * 0.18, pw, ph * 0.18);

    const sh = face.height / STRIPS;
    for (let i = 0; i < STRIPS; i++) {
      const v0 = i / STRIPS;
      const v1 = (i + 1) / STRIPS;
      const y0 = yAt(v0);
      const y1 = yAt(v1);
      const w = pw * widen((v0 + v1) / 2);
      const sy = front ? i * sh : (STRIPS - 1 - i) * sh;
      ctx.drawImage(face, 0, sy, face.width, sh, x - (w - pw) / 2, Math.min(y0, y1) - 0.5, w, Math.abs(y1 - y0) + 1);
    }

    ctx.beginPath();
    for (let i = 0; i <= STRIPS; i++) {
      const v = i / STRIPS;
      ctx.lineTo(x - (pw * widen(v) - pw) / 2, yAt(v));
    }
    for (let i = STRIPS; i >= 0; i--) {
      const v = i / STRIPS;
      ctx.lineTo(x + pw + (pw * widen(v) - pw) / 2, yAt(v));
    }
    ctx.closePath();
    const g = ctx.createLinearGradient(0, spine, 0, tip);
    const a = front ? 1 : 0.7;
    g.addColorStop(0, `rgba(40,30,20,${(0.06 * sin * a).toFixed(3)})`);
    g.addColorStop(1, `rgba(40,30,20,${(0.3 * sin * a).toFixed(3)})`);
    ctx.fillStyle = g;
    ctx.fill();
  }
}

