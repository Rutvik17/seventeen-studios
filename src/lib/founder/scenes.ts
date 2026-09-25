/**
 * THE FOUNDER FILM'S SCENES — each a drawing and what moves in it.
 *
 * Every scene is described in one world of 1600 × 1000 as the landing's
 * campus is: pencil strokes (`ink`, in the order the hand draws them) and
 * watercolour washes (`washes`, in the order a painter lays them), which the
 * director (`director.ts`) sketches and paints in front of the reader; and
 * `live`, what keeps moving once the painting is made — characters falling
 * into memory as their bytes, warps lighting across a GPU — drawn over it
 * every frame.
 *
 * Every number drawn here comes from `facts.ts`, as the captions' do.
 */

import type { SceneId } from '@/content/founder';
import { clamp, rng, smooth, type Rng } from '@/lib/film/random';
import { blob, Wash, type Glazed, type Pt, type WashStyle } from '@/lib/film/wash';
import { pencil, ruled, type PencilStyle, type Stroke } from '@/lib/film/pencil';
import { CPU_CORES, race, SMS, threadIndex, typed, WARP } from './facts';

export interface LiveState {
  /** Seconds since the scene began. */
  t: number;
  /** How far the making (pencil, then paint) has got, 0–1. */
  made: number;
  /** Seconds since the painting was finished; negative while it is being made. */
  alive: number;
  /** The handwriting's font family. */
  hand: string;
}

export interface SceneArt {
  ink: Stroke[];
  washes: Glazed[];
  /** How dark the pencil stays once the painting is finished (1: as drawn). */
  inkAfter?: number;
  live?: (ctx: CanvasRenderingContext2D, s: LiveState) => void;
  /** What must stay on screen on a narrow one. */
  focus: { x: number; y: number; w: number; h: number };
}

/* ------------------------------------------------------------------ *
 * Paints and helpers                                                  *
 * ------------------------------------------------------------------ */

export const PAINT = {
  ink: '#1d1d21',
  ultramarine: '#2b3f9e',
  sky: '#8fb3d9',
  pale: '#dfe8f2',
  green: '#3f7d3a',
  nvidia: '#76a83a',
  orange: '#e08a2b',
  red: '#cf3f2c',
  yellow: '#eba42c',
  violet: '#5a3a8e',
  grey: '#8a8f99',
  steel: '#b9bec7',
  night: '#1f2a44',
};

export const DIAGRAM_FOCUS = { x: 200, y: 90, w: 1200, h: 690 };

class Kit {
  ink: Stroke[] = [];
  washes: Wash[] = [];
  constructor(readonly r: Rng) {}
  line(a: Pt, b: Pt, o: PencilStyle = {}) {
    this.ink.push(...ruled(a, b, this.r, { width: 1.1, tone: 0.85, ...o }, 0.3));
  }
  path(pts: Pt[], o: PencilStyle = {}) {
    this.ink.push(pencil(pts, this.r, { width: 1, tone: 0.8, ...o }));
  }
  rect(x: number, y: number, w: number, h: number, o: PencilStyle = {}) {
    const p = rectPts(x, y, w, h);
    for (let i = 0; i < 4; i++) this.line(p[i], p[(i + 1) % 4], o);
  }
  circle(cx: number, cy: number, rad: number, o: PencilStyle = {}) {
    const p = circlePts(cx, cy, rad);
    this.path([...p, p[0]], { overshoot: 3, ...o });
  }
  arrow(a: Pt, b: Pt, o: PencilStyle = {}) {
    this.line(a, b, o);
    const ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
    for (const s of [-1, 1]) this.path([b, [b[0] - Math.cos(ang + s * 0.45) * 18, b[1] - Math.sin(ang + s * 0.45) * 18]], { overshoot: 0, ...o });
  }
  paint(poly: Pt[], color: string, o: Partial<WashStyle> = {}) {
    this.washes.push(new Wash(poly, { color, layers: 10, alpha: 0.09, spread: 0.12, edge: 0.45, ...o }, this.r));
  }
  splash(cx: number, cy: number, rx: number, ry: number, color: string, o: Partial<WashStyle> = {}) {
    this.paint(blob(cx, cy, rx, ry, this.r, 10), color, { spread: 0.35, edge: 0.3, ...o });
  }
}

export const rectPts = (x: number, y: number, w: number, h: number): Pt[] => [
  [x, y],
  [x + w, y],
  [x + w, y + h],
  [x, y + h],
];
export const circlePts = (cx: number, cy: number, rad: number, n = 40): Pt[] =>
  Array.from({ length: n }, (_, k) => [cx + Math.cos((k / n) * Math.PI * 2) * rad, cy + Math.sin((k / n) * Math.PI * 2) * rad] as Pt);

/** Write `s` by hand, appearing left to right from `at` seconds after the painting is made. */
export function write(ctx: CanvasRenderingContext2D, st: LiveState, s: string, x: number, y: number, size: number, o: { at?: number; align?: CanvasTextAlign; colour?: string; weight?: number; alpha?: number } = {}) {
  const at = o.at ?? -1.5;
  const dur = Math.max(0.5, s.length * 0.045);
  const p = clamp((st.alive - at) / dur);
  if (p <= 0) return;
  ctx.save();
  ctx.font = `${o.weight ?? 600} ${size}px ${st.hand}`;
  ctx.textAlign = o.align ?? 'left';
  ctx.textBaseline = 'alphabetic';
  const w = ctx.measureText(s).width;
  const x0 = o.align === 'center' ? x - w / 2 : o.align === 'right' ? x - w : x;
  if (p < 1) {
    ctx.beginPath();
    ctx.rect(x0 - 4, y - size * 1.2, (w + 8) * p, size * 1.6);
    ctx.clip();
  }
  ctx.globalAlpha = o.alpha ?? 1;
  ctx.fillStyle = o.colour ?? PAINT.ink;
  ctx.fillText(s, x, y);
  ctx.restore();
}

export function glow(ctx: CanvasRenderingContext2D, x: number, y: number, rad: number, rgb: string, a: number) {
  if (a <= 0.01) return;
  const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
  g.addColorStop(0, `rgba(${rgb},${a.toFixed(3)})`);
  g.addColorStop(1, `rgba(${rgb},0)`);
  ctx.fillStyle = g;
  ctx.fillRect(x - rad, y - rad, rad * 2, rad * 2);
}

function dot(ctx: CanvasRenderingContext2D, x: number, y: number, rad: number, colour: string, a = 1) {
  ctx.globalAlpha = a;
  ctx.fillStyle = colour;
  ctx.beginPath();
  ctx.arc(x, y, rad, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
}


/** A lamp: glass and a socket drawn once; lit in `live`. */
function lampArt(k: Kit, x: number, y: number, rad: number) {
  k.circle(x, y, rad, { width: 1 });
  k.rect(x - rad * 0.4, y + rad * 0.9, rad * 0.8, rad * 0.45, { width: 0.8 });
  k.paint(circlePts(x, y, rad * 0.96, 24), PAINT.pale, { layers: 6, alpha: 0.12 });
  k.paint(rectPts(x - rad * 0.4, y + rad * 0.9, rad * 0.8, rad * 0.45), PAINT.grey, { layers: 5, alpha: 0.14 });
}
function lampLit(ctx: CanvasRenderingContext2D, x: number, y: number, rad: number, on: number) {
  if (on <= 0.01) return;
  glow(ctx, x, y, rad * 2.2, '255,205,110', 0.55 * on);
  dot(ctx, x, y, rad * 0.8, '#ffd27a', 0.75 * on);
}

/* ------------------------------------------------------------------ *
 * Timing and drawing helpers for the stories                          *
 * ------------------------------------------------------------------ */

/** Where a repeating story is, `t` seconds in, for a loop `period` long. */
const cyc = (t: number, period: number) => ((t % period) + period) % period;

/** The same state with its clock moved — so `write` can be timed inside a loop. */
const at = (st: LiveState, alive: number): LiveState => ({ ...st, alive });

/** Text drawn at once, in the hand. */
function text(ctx: CanvasRenderingContext2D, st: LiveState, s: string, x: number, y: number, size: number, o: { align?: CanvasTextAlign; colour?: string; weight?: number; alpha?: number } = {}) {
  if ((o.alpha ?? 1) <= 0.01) return;
  ctx.save();
  ctx.font = `${o.weight ?? 600} ${size}px ${st.hand}`;
  ctx.textAlign = o.align ?? 'left';
  ctx.globalAlpha = o.alpha ?? 1;
  ctx.fillStyle = o.colour ?? PAINT.ink;
  ctx.fillText(s, x, y);
  ctx.restore();
}

function width(ctx: CanvasRenderingContext2D, st: LiveState, s: string, size: number, weight = 600) {
  ctx.save();
  ctx.font = `${weight} ${size}px ${st.hand}`;
  const w = ctx.measureText(s).width;
  ctx.restore();
  return w;
}

/** A speech bubble in watercolour: a pale wash with a darker edge and the words written in it. */
function bubble(ctx: CanvasRenderingContext2D, st: LiveState, s: string, x: number, y: number, size: number, show: number, colour = PAINT.pale) {
  if (show <= 0.01) return;
  const w = width(ctx, st, s, size) + size * 1.1;
  const h = size * 1.7;
  ctx.save();
  ctx.globalAlpha = show;
  ctx.fillStyle = colour;
  ctx.strokeStyle = 'rgba(29,29,33,0.45)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.roundRect(x - w / 2, y - h / 2, w, h, h / 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
  text(ctx, st, s, x, y + size * 0.35, size, { align: 'center', alpha: show, weight: 700 });
}

function line(ctx: CanvasRenderingContext2D, pts: Pt[], colour: string, w: number, alpha = 1) {
  if (alpha <= 0.01 || pts.length < 2) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = colour;
  ctx.lineWidth = w;
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (const p of pts.slice(1)) ctx.lineTo(p[0], p[1]);
  ctx.stroke();
  ctx.restore();
}


/* ------------------------------------------------------------------ *
 * The scenes                                                          *
 * ------------------------------------------------------------------ */

/**
 * 0s and 1s. A line of C++ is typed on a laptop; each character, as it is
 * typed, drops out of the screen into eight lamps — the byte it is stored as.
 */
function binary(r: Rng): SceneArt {
  const k = new Kit(r);
  const scr = { x: 560, y: 110, w: 480, h: 300 };
  k.rect(scr.x, scr.y, scr.w, scr.h, { width: 1.4 });
  k.rect(scr.x + 20, scr.y + 20, scr.w - 40, scr.h - 40, { width: 0.9 });
  const base: Pt[] = [[500, scr.y + scr.h], [1100, scr.y + scr.h], [1160, scr.y + scr.h + 56], [440, scr.y + scr.h + 56]];
  k.path([...base, base[0]], { width: 1.3 });
  for (let i = 0; i < 3; i++) k.line([500 + i * 8, scr.y + scr.h + 14 + i * 12], [1100 - i * 8, scr.y + scr.h + 14 + i * 12], { width: 0.5, tone: 0.35 });
  k.paint(rectPts(scr.x, scr.y, scr.w, scr.h), PAINT.steel, { layers: 8 });
  k.paint(rectPts(scr.x + 20, scr.y + 20, scr.w - 40, scr.h - 40), PAINT.night, { layers: 14, alpha: 0.12 });
  k.paint(base, PAINT.steel, { layers: 8 });
  // Eight lamps: the byte of the character just typed.
  const LX = (i: number) => 590 + i * 60;
  const LY = 600;
  for (let i = 0; i < 8; i++) lampArt(k, LX(i), LY, 22);
  const chars = typed();
  const lines = ['int main() {', '  int a = 2, b = 3;', null, '  return sum;', '}'];
  const TYPE_AT = 0.4;
  const PER = 0.32;
  const typedBy = TYPE_AT + chars.length * PER;
  return {
    ink: k.ink,
    washes: k.washes,
    focus: { x: 220, y: 80, w: 1160, h: 720 },
    live(ctx, st) {
      const X0 = scr.x + 45;
      const LINE = (i: number) => scr.y + 62 + i * 46;
      lines.forEach((l, i) => l && write(ctx, st, l, X0, LINE(i), 28, { at: -1.2 + i * 0.15, colour: '#e8eef8' }));
      write(ctx, st, 'memory: one byte', LX(3.5), LY + 70, 26, { at: -0.8, align: 'center', colour: PAINT.grey });
      if (st.alive < 0) return;
      // Typing, one character every PER seconds; then reading the line back, a character at a time.
      const n = Math.min(chars.length, Math.max(0, Math.floor((st.alive - TYPE_AT) / PER) + 1));
      // Then it is read back, one character at a time, each dropping into memory as its byte.
      const READ = 1.7;
      const reading = st.alive > typedBy + 0.6;
      const cur = reading ? Math.floor((st.alive - typedBy - 0.6) / READ) % chars.length : -1;
      const since = reading ? cyc(st.alive - typedBy - 0.6, READ) : 0;
      const shown = '  ' + chars.slice(0, n).map((c) => c.ch).join('');
      text(ctx, st, shown, X0, LINE(2), 28, { colour: '#ffd27a' });
      if (!reading && Math.floor(st.t * 2.5) % 2 === 0) text(ctx, st, '|', X0 + width(ctx, st, shown, 28), LINE(2), 28, { colour: '#ffd27a' });
      if (cur < 0) return;
      const c = chars[cur];
      // Mark the character on the screen.
      const cx = X0 + width(ctx, st, '  ' + chars.slice(0, cur).map((q) => q.ch).join(''), 28);
      const cw = Math.max(10, width(ctx, st, c.ch, 28));
      ctx.fillStyle = 'rgba(255,210,122,0.25)';
      ctx.fillRect(cx - 2, LINE(2) - 26, cw + 4, 34);
      // Its eight bits fall from the screen into the lamps.
      const fall = smooth(0.1, 0.8, since);
      c.bits.forEach((b, i) => {
        const x = cx + cw / 2 + (LX(i) - cx - cw / 2) * fall;
        const y = LINE(2) + 10 + (LY - LINE(2) - 10) * fall * fall;
        if (fall < 1) text(ctx, st, String(b), x, y, 24, { align: 'center', weight: 700, colour: b ? PAINT.ultramarine : PAINT.grey, alpha: 0.9 });
        lampLit(ctx, LX(i), LY, 22, b * smooth(0.75, 0.9, since));
        text(ctx, st, String(b), LX(i), LY + 7, 22, { align: 'center', weight: 700, alpha: smooth(0.75, 0.9, since), colour: b ? PAINT.ink : PAINT.grey });
      });
      const name = c.ch === ' ' ? 'a space' : `'${c.ch}'`;
      text(ctx, st, `${name} is stored as ${c.code} = ${c.bits.join('')}`, 800, LY + 130, 38, { align: 'center', weight: 700, colour: PAINT.ultramarine, alpha: smooth(0.8, 1, since) });
    },
  };
}

/**
 * The GPU. A CUDA kernel — the same one line of C++ for every thread — is
 * launched: every streaming multiprocessor lights a warp of 32 threads, each
 * adding one pair of numbers. Then a race: the same 768 additions on four CPU
 * cores, four at a time.
 */
function gpuScene(r: Rng): SceneArt {
  const k = new Kit(r);
  const die = { x: 380, y: 240, w: 840, h: 400 };
  k.rect(die.x, die.y, die.w, die.h, { width: 1.4 });
  k.paint(rectPts(die.x, die.y, die.w, die.h), PAINT.nvidia, { layers: 12, alpha: 0.08 });
  const cols = 6;
  const rows = SMS / cols;
  const sw = 120;
  const sh = 82;
  const SM = (c: number, rr: number): Pt => [die.x + 30 + c * (sw + 14), die.y + 28 + rr * (sh + 14)];
  for (let c = 0; c < cols; c++)
    for (let rr = 0; rr < rows; rr++) {
      const [x, y] = SM(c, rr);
      k.rect(x, y, sw, sh, { width: 0.8, tone: 0.6 });
      k.paint(rectPts(x, y, sw, sh), PAINT.green, { layers: 6, alpha: 0.07 });
    }
  for (const x of [250, 1270]) {
    for (let i = 0; i < 2; i++) {
      k.rect(x, 270 + i * 190, 80, 150, { width: 1 });
      k.paint(rectPts(x, 270 + i * 190, 80, 150), PAINT.violet, { layers: 8, alpha: 0.08 });
    }
  }
  // The kernel's card, and the race's two lanes.
  k.rect(380, 70, 840, 140, { width: 1.1 });
  k.paint(rectPts(380, 70, 840, 140), PAINT.night, { layers: 12, alpha: 0.1 });
  k.line([520, 700], [1300, 700], { width: 0.6, tone: 0.4 });
  k.line([520, 760], [1300, 760], { width: 0.6, tone: 0.4 });
  const rc = race();
  const kernel = ['__global__ void add(float* a, float* b, float* c) {', '  int i = blockIdx.x * blockDim.x + threadIdx.x;', '  c[i] = a[i] + b[i];   }'];
  const LAUNCH = 3;
  const HOT = 5;
  const hot = SM(HOT % cols, Math.floor(HOT / cols));
  return {
    ink: k.ink,
    washes: k.washes,
    focus: { x: 220, y: 50, w: 1180, h: 740 },
    live(ctx, st) {
      write(ctx, st, 'memory', 290, 648, 26, { at: -1.2, align: 'center', colour: PAINT.violet });
      write(ctx, st, 'memory', 1310, 648, 26, { at: -1.2, align: 'center', colour: PAINT.violet });
      write(ctx, st, 'GPU', 800, 234, 28, { at: -1.1, align: 'center', weight: 700 });
      write(ctx, st, `CPU · ${CPU_CORES} cores`, 505, 708, 26, { at: -1, align: 'right' });
      write(ctx, st, `GPU · ${SMS} × ${WARP} threads`, 505, 768, 26, { at: -1, align: 'right' });
      const t = st.alive < 0 ? -1 : cyc(st.alive, 15);
      const T = at(st, t);
      kernel.forEach((l, i) => write(ctx, T, l, 410, 112 + i * 36, 24, { at: 0.2 + i * 0.8, colour: '#e8eef8' }));
      // The streaming multiprocessors, each lighting its warp as the launch reaches it.
      for (let c = 0; c < cols; c++)
        for (let rr = 0; rr < rows; rr++) {
          const b = rr * cols + c;
          const [x, y] = SM(c, rr);
          const on = t < 0 ? 0 : smooth(LAUNCH + b * 0.05, LAUNCH + 0.3 + b * 0.05, t) * (1 - smooth(12.5, 13.5, t));
          for (let i = 0; i < WARP; i++) {
            const cx = x + 14 + (i % 8) * 13;
            const cy = y + 18 + Math.floor(i / 8) * 17;
            const flick = on > 0.5 ? 0.75 + 0.25 * Math.sin(st.t * 9 + i + b) : 1;
            dot(ctx, cx, cy, 4, on > 0.5 ? '#f4d27a' : PAINT.green, (0.35 + 0.65 * Math.max(on, 0.25)) * flick);
          }
          glow(ctx, x + sw / 2, y + sh / 2, 80, '240,210,120', 0.25 * on);
        }
      if (t < 0) return;
      // One block, looked at closely: its 32 threads, each with its own i.
      const look = smooth(LAUNCH + 1.5, LAUNCH + 2, t) * (1 - smooth(12.5, 13.5, t));
      if (look > 0) {
        line(ctx, [[hot[0] - 4, hot[1] - 4], [hot[0] + sw + 4, hot[1] - 4], [hot[0] + sw + 4, hot[1] + sh + 4], [hot[0] - 4, hot[1] + sh + 4], [hot[0] - 4, hot[1] - 4]], PAINT.red, 2.5, look);
        bubble(ctx, st, `block ${HOT}: i = ${threadIndex(HOT, 0)} … ${threadIndex(HOT, WARP - 1)}`, hot[0] + sw / 2, hot[1] - 26, 22, look, '#fbe9e4');
      }
      // Data streaming in from memory.
      for (let i = 0; i < 8; i++) {
        const u = (st.alive * 0.6 + i / 8) % 1;
        dot(ctx, 330 + u * 50, 290 + i * 38, 4, PAINT.violet, 0.7 * smooth(LAUNCH, LAUNCH + 0.5, t));
        dot(ctx, 1270 - u * 50, 290 + i * 38, 4, PAINT.violet, 0.7 * smooth(LAUNCH, LAUNCH + 0.5, t));
      }
      // The race: the same additions, four at a time on the CPU.
      const go = 7;
      const gpu = smooth(go, go + 0.35, t);
      const cpu = clamp((t - go) / 5.5);
      ctx.fillStyle = 'rgba(118,168,58,0.7)';
      ctx.fillRect(520, 730, 780 * gpu, 22);
      ctx.fillStyle = 'rgba(143,179,217,0.8)';
      ctx.fillRect(520, 672, 780 * cpu, 22);
      if (t > go) {
        text(ctx, st, `${Math.min(rc.cpuSteps, Math.floor(cpu * rc.cpuSteps))} of ${rc.cpuSteps} steps`, 1310, 690, 24, { colour: PAINT.grey });
        text(ctx, st, `${rc.gpuSteps} step: all ${rc.elements} at once`, 1310, 750, 24, { weight: 700, colour: PAINT.green, alpha: gpu });
      }
    },
  };
}

const BUILDERS: Partial<Record<SceneId, (r: Rng) => SceneArt>> = {
  binary,
  gpu: gpuScene,
};

export function buildScene(id: SceneId, seed: number): SceneArt | null {
  const b = BUILDERS[id];
  return b ? b(rng(seed)) : null;
}
