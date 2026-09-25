/**
 * THE FOUNDER FILM'S SCENES — each a drawing and what moves in it.
 *
 * Every scene is described in one world of 1600 × 1000 as the landing's
 * campus is: pencil strokes (`ink`, in the order the hand draws them) and
 * watercolour washes (`washes`, in the order a painter lays them), which the
 * director (`director.ts`) sketches and paints in front of the reader; and
 * `live`, what keeps moving once the painting is made — current through a
 * switch, lamps lighting up bit by bit, a pulse through a gate, warps across
 * a GPU, a ball rolling down a loss curve — drawn over it every frame.
 *
 * Every number drawn here comes from `facts.ts`, as the captions' do.
 */

import type { SceneId } from '@/content/founder';
import { between, clamp, rng, smooth, type Rng } from '@/lib/film/random';
import { blob, Wash, type Glazed, type Pt, type WashStyle } from '@/lib/film/wash';
import { curve, pencil, ruled, type PencilStyle, type Stroke } from '@/lib/film/pencil';
import { agentRun, ASSEMBLY, attention, byteOf, CANDIDATES, CONTEXT, countTo, CPU_CORES, descent, encodeAdd, LETTER, loss, matmul, modrmFields, neuron, race, RATE, runProgram, sigmoid, SMS, softmax, TARGET, TASK, threadIndex, truthTable, typed, WARP } from './facts';

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

function along(pts: Pt[], u: number): Pt {
  const seg: number[] = [];
  let total = 0;
  for (let i = 1; i < pts.length; i++) {
    const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    seg.push(l);
    total += l;
  }
  let d = clamp(u) * total;
  for (let i = 0; i < seg.length; i++) {
    if (d <= seg[i]) {
      const t = d / (seg[i] || 1);
      return [pts[i][0] + (pts[i + 1][0] - pts[i][0]) * t, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * t];
    }
    d -= seg[i];
  }
  return pts[pts.length - 1];
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

/** Part of a polyline, from its start to fraction `u` of its length. */
function partOf(pts: Pt[], u: number): Pt[] {
  if (u >= 1) return pts;
  const total = pts.slice(1).reduce((s, p, i) => s + Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1]), 0);
  let d = clamp(u) * total;
  const out: Pt[] = [pts[0]];
  for (let i = 1; i < pts.length; i++) {
    const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    if (d >= l) {
      out.push(pts[i]);
      d -= l;
    } else {
      out.push([pts[i - 1][0] + ((pts[i][0] - pts[i - 1][0]) * d) / (l || 1), pts[i - 1][1] + ((pts[i][1] - pts[i - 1][1]) * d) / (l || 1)]);
      break;
    }
  }
  return out;
}

const fmt2 = (v: number) => String(Math.round(v * 100) / 100).replace('-', '−');

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
 * A switch. A transistor in section wired into a circuit with a lamp: a
 * positive voltage on the gate pulls electrons up under it into a channel
 * joining source to drain, current flows round the circuit, the lamp lights.
 */
function switchScene(r: Rng): SceneArt {
  const k = new Kit(r);
  const top = 380;
  const bot = 470;
  const src = { x0: 280, x1: 640 };
  const drn = { x0: 960, x1: 1240 };
  k.rect(260, top, 1000, 170, { width: 1.3 });
  k.line([src.x1, top], [src.x1, bot], { width: 1 });
  k.line([src.x0 + 20, bot], [src.x1, bot], { width: 1 });
  k.line([drn.x0, top], [drn.x0, bot], { width: 1 });
  k.line([drn.x0, bot], [drn.x1 - 20, bot], { width: 1 });
  k.rect(src.x1 + 10, top - 22, drn.x0 - src.x1 - 20, 16, { width: 0.8, tone: 0.6 });
  k.rect(src.x1 + 10, top - 150, drn.x0 - src.x1 - 20, 128, { width: 1.2 });
  k.line([800, top - 150], [800, top - 200], { width: 1.1 });
  k.circle(800, top - 214, 14, { width: 1 });
  k.paint(rectPts(260, top, 1000, 170), PAINT.grey, { layers: 8, alpha: 0.06 });
  k.paint(rectPts(src.x0 - 20, top, src.x1 - src.x0 + 20, bot - top), PAINT.sky, { layers: 10, alpha: 0.09 });
  k.paint(rectPts(drn.x0, top, drn.x1 - drn.x0 + 20, bot - top), PAINT.sky, { layers: 10, alpha: 0.09 });
  k.paint(rectPts(src.x1 + 10, top - 150, drn.x0 - src.x1 - 20, 128), PAINT.orange, { layers: 10, alpha: 0.09 });
  // The circuit: from the source, up through a battery, across to a lamp, and back into the drain.
  const bulb: Pt = [1420, 230];
  const circuit: Pt[] = [[1120, top], [1120, 330], [1420, 330], [1420, bulb[1] + 58], [1420, bulb[1] - 58], [1420, 90], [400, 90], [400, 205], [400, 233], [400, top]];
  k.path(circuit.slice(0, 4), { width: 1, overshoot: 0 });
  k.path(circuit.slice(4, 8), { width: 1, overshoot: 0 });
  k.path(circuit.slice(8), { width: 1, overshoot: 0 });
  k.line([362, 205], [438, 205], { width: 1.6 });
  k.line([380, 233], [420, 233], { width: 2.2 });
  k.circle(bulb[0], bulb[1], 58, { width: 1.2 });
  k.paint(circlePts(bulb[0], bulb[1], 56, 30), PAINT.pale, { layers: 8, alpha: 0.12 });
  const electrons = Array.from({ length: 34 }, () => ({ p: r(), y: between(r, top + 12, bot - 12), v: between(r, 0.14, 0.22), home: between(r, src.x0 + 30, src.x1 - 20) }));
  // Electrons from deeper in the silicon, pulled up under the gate when it is on.
  const deep = Array.from({ length: 12 }, () => ({ x: between(r, src.x1 + 20, drn.x0 - 20), y: between(r, bot + 10, 535) }));
  return {
    ink: k.ink,
    washes: k.washes,
    focus: { x: 220, y: 60, w: 1360, h: 600 },
    live(ctx, st) {
      write(ctx, st, 'source', (src.x0 + src.x1) / 2, 600, 32, { at: -1.2, align: 'center' });
      write(ctx, st, 'drain', (drn.x0 + drn.x1) / 2, 600, 32, { at: -1.1, align: 'center' });
      write(ctx, st, 'gate', 830, top - 208, 30, { at: -1 });
      write(ctx, st, 'n', 330, 450, 30, { at: -0.9, colour: PAINT.ultramarine, weight: 700 });
      write(ctx, st, 'n', 1200, 450, 30, { at: -0.9, colour: PAINT.ultramarine, weight: 700 });
      write(ctx, st, 'p-type silicon', 1240, 538, 24, { at: -0.8, align: 'right', colour: PAINT.grey });
      write(ctx, st, 'glass', drn.x0 - 8, top - 26, 22, { at: -0.7, align: 'right', colour: PAINT.grey });
      write(ctx, st, 'battery', 350, 225, 24, { at: -0.6, align: 'right', colour: PAINT.grey });
      write(ctx, st, 'lamp', bulb[0] + 76, bulb[1] + 8, 26, { at: -0.6, colour: PAINT.grey });
      if (st.alive < 0) return;
      // The gate's voltage: on for 3 s, off for 2.5 s.
      const t = cyc(st.alive, 5.5);
      const on = t < 3 ? smooth(0, 0.3, t) : 1 - smooth(3, 3.3, t);
      const channel = t < 3 ? smooth(0.3, 1.2, t) : 1 - smooth(3, 3.4, t);
      text(ctx, st, on > 0.5 ? 'gate: +1 V' : 'gate: 0 V', 800, top - 70, 30, { align: 'center', weight: 700, colour: on > 0.5 ? PAINT.red : PAINT.grey });
      for (let i = 0; i < 6; i++) text(ctx, st, '+', 690 + i * 44, top - 32, 26, { align: 'center', weight: 700, colour: PAINT.red, alpha: on });
      // Electrons gather under the glass: the channel.
      deep.forEach((d) => dot(ctx, d.x, d.y + (top + 10 - d.y) * channel, 4.5, PAINT.ultramarine, 0.7));
      ctx.fillStyle = `rgba(43,63,158,${(0.3 * channel).toFixed(3)})`;
      ctx.fillRect(src.x1, top + 2, drn.x0 - src.x1, 16);
      if (channel > 0.6) text(ctx, st, 'channel', 800, top + 48, 26, { align: 'center', colour: PAINT.ultramarine, alpha: smooth(0.6, 1, channel) });
      const flowing = channel > 0.9;
      for (const e of electrons) {
        if (flowing) e.p = (e.p + e.v / 60) % 1;
        const pos = src.x0 + 10 + e.p * (drn.x1 - src.x0 - 20);
        const x = flowing || pos > drn.x0 ? pos : Math.min(pos, e.home);
        dot(ctx, x, x > src.x1 && x < drn.x0 ? top + 10 : e.y, 5, PAINT.ultramarine, 0.75);
      }
      // Round the circuit, electrons go from drain, through the lamp and battery, back to the source.
      if (flowing) {
        for (let i = 0; i < 16; i++) {
          const [x, y] = along(circuit, (st.alive * 0.12 + i / 16) % 1);
          dot(ctx, x, y, 4, PAINT.ultramarine, 0.7);
        }
      }
      const lit = flowing ? 1 : 0;
      glow(ctx, bulb[0], bulb[1], 160, '255,205,110', 0.6 * lit);
      dot(ctx, bulb[0], bulb[1], 30, '#ffd27a', 0.8 * lit);
      text(ctx, st, lit ? '1' : '0', bulb[0], bulb[1] + 32, 90, { align: 'center', weight: 700, colour: lit ? PAINT.ink : PAINT.grey });
    },
  };
}

/**
 * A byte. Eight lamps count up in binary, each worth twice the one to its
 * right, and stop at 82 — the code for R.
 */
function byteScene(r: Rng): SceneArt {
  const k = new Kit(r);
  const byte = byteOf(LETTER);
  const counts = countTo(byte.code);
  const X = (i: number) => 330 + i * 134;
  for (let i = 0; i < 8; i++) lampArt(k, X(i), 330, 44);
  k.line([270, 440], [1330, 440], { width: 0.7, tone: 0.4 });
  const COUNT = 5;
  return {
    ink: k.ink,
    washes: k.washes,
    focus: { x: 220, y: 110, w: 1160, h: 660 },
    live(ctx, st) {
      byte.places.forEach((p, i) => write(ctx, st, String(p), X(i), 255, 30, { at: -1.4 + i * 0.1, align: 'center', colour: PAINT.grey }));
      if (st.alive < 0) return;
      const t = cyc(st.alive, 14);
      // Count 0, 1, 10, 11, 100 … up to the letter's code.
      const i = Math.min(counts.length - 1, Math.floor(Math.pow(clamp(t / COUNT), 1.6) * (counts.length - 1)));
      const c = counts[i];
      c.bits.forEach((b, j) => {
        lampLit(ctx, X(j), 330, 44, b);
        text(ctx, st, String(b), X(j), 510, 52, { align: 'center', weight: 700, colour: b ? PAINT.ultramarine : PAINT.grey });
      });
      text(ctx, st, t < COUNT ? `counting: ${c.v}` : `stop at ${c.v}`, 800, 600, 40, { align: 'center', weight: 700, alpha: 0.85 });
      if (t < COUNT + 0.4) return;
      // The places that are on, added up.
      byte.places.forEach((p, j) => byte.bits[j] && text(ctx, st, String(p), X(j), 255, 34, { align: 'center', weight: 700, colour: PAINT.red, alpha: smooth(COUNT + 0.4, COUNT + 1, t) }));
      write(ctx, at(st, t), `${byte.on.join(' + ')} = ${byte.code}`, 800, 670, 46, { at: COUNT + 1, align: 'center', weight: 700 });
      write(ctx, at(st, t), `and in ASCII, ${byte.code} is`, 740, 750, 40, { at: COUNT + 2.6, align: 'right', colour: PAINT.ultramarine });
      text(ctx, st, LETTER, 790, 770, 110, { weight: 700, colour: PAINT.orange, alpha: smooth(COUNT + 3.6, COUNT + 4.2, t) });
    },
  };
}

/**
 * Logic. A half adder tried every way in — 0 and 0, 0 and 1, 1 and 0, 1 and
 * 1 — current glowing along each wire that carries a 1, the truth table
 * filling in underneath.
 */
function logicScene(r: Rng): SceneArt {
  const k = new Kit(r);
  const table = truthTable();
  lampArt(k, 300, 240, 34);
  lampArt(k, 300, 480, 34);
  const gate = (x: number, y: number, xor: boolean) => {
    const w = 150;
    const h = 120;
    if (xor) {
      k.path(curve([[x, y - h / 2], [x + 30, y], [x, y + h / 2]], 6), { width: 1.2 });
      k.path(curve([[x - 18, y - h / 2], [x + 12, y], [x - 18, y + h / 2]], 6), { width: 1 });
      k.path(curve([[x, y - h / 2], [x + w * 0.6, y - h * 0.4], [x + w, y]], 6), { width: 1.2 });
      k.path(curve([[x, y + h / 2], [x + w * 0.6, y + h * 0.4], [x + w, y]], 6), { width: 1.2 });
      k.paint([[x + 10, y - h / 2 + 6], [x + w * 0.6, y - h * 0.36], [x + w - 8, y], [x + w * 0.6, y + h * 0.36], [x + 10, y + h / 2 - 6], [x + 32, y]], PAINT.sky, { layers: 10 });
    } else {
      k.line([x, y - h / 2], [x, y + h / 2], { width: 1.2 });
      k.line([x, y - h / 2], [x + w * 0.5, y - h / 2], { width: 1.2 });
      k.line([x, y + h / 2], [x + w * 0.5, y + h / 2], { width: 1.2 });
      k.path(Array.from({ length: 17 }, (_, i) => [x + w * 0.5 + (Math.cos(-Math.PI / 2 + (i / 16) * Math.PI) * h) / 2, y + (Math.sin(-Math.PI / 2 + (i / 16) * Math.PI) * h) / 2] as Pt), { width: 1.2 });
      k.paint([[x, y - h / 2], [x + w * 0.5, y - h / 2], [x + w * 0.5 + h / 2, y], [x + w * 0.5, y + h / 2], [x, y + h / 2]], PAINT.orange, { layers: 10 });
    }
  };
  gate(720, 240, true);
  gate(720, 480, false);
  const fromA: Pt[][] = [
    [[334, 240], [520, 240], [520, 215], [730, 215]],
    [[334, 240], [600, 240], [600, 455], [720, 455]],
  ];
  const fromB: Pt[][] = [
    [[334, 480], [560, 480], [560, 265], [730, 265]],
    [[334, 480], [640, 480], [640, 505], [720, 505]],
  ];
  const sumWire: Pt[] = [[870, 240], [1150, 240]];
  const carryWire: Pt[] = [[855, 480], [1150, 480]];
  for (const w of [...fromA, ...fromB, sumWire, carryWire]) k.path(w, { width: 0.9, tone: 0.7, overshoot: 0 });
  lampArt(k, 1190, 240, 38);
  lampArt(k, 1190, 480, 38);
  // The truth table's ruling.
  const TX = [560, 660, 820, 920, 1040];
  k.line([520, 668], [1110, 668], { width: 0.8, tone: 0.5 });
  k.line([760, 630], [760, 790], { width: 0.8, tone: 0.5 });
  return {
    ink: k.ink,
    washes: k.washes,
    focus: { x: 220, y: 150, w: 1180, h: 660 },
    live(ctx, st) {
      write(ctx, st, 'A', 300, 175, 32, { at: -1.5, align: 'center', weight: 700 });
      write(ctx, st, 'B', 300, 570, 32, { at: -1.4, align: 'center', weight: 700 });
      write(ctx, st, 'XOR', 785, 250, 30, { at: -1.2, align: 'center', weight: 700 });
      write(ctx, st, 'AND', 790, 490, 30, { at: -1.1, align: 'center', weight: 700 });
      write(ctx, st, 'sum', 1250, 250, 32, { at: -1 });
      write(ctx, st, 'carry', 1250, 490, 32, { at: -1 });
      ['A', 'B', 'carry', 'sum', 'value'].forEach((h, i) => write(ctx, st, h, TX[i], 655, 26, { at: -0.8, align: 'center', colour: PAINT.grey }));
      dot(ctx, 520, 240, 6, PAINT.ink);
      dot(ctx, 560, 480, 6, PAINT.ink);
      if (st.alive < 0) return;
      // Every way in, 2.8 s each; the table fills in as each is tried.
      const t = cyc(st.alive, 4 * 2.8);
      const row = Math.floor(t / 2.8);
      const local = t - row * 2.8;
      const { a, b, sum, carry, value } = table[row];
      const u = cyc(st.alive * 0.9, 1);
      lampLit(ctx, 300, 240, 34, a);
      lampLit(ctx, 300, 480, 34, b);
      text(ctx, st, String(a), 300, 250, 30, { align: 'center', weight: 700 });
      text(ctx, st, String(b), 300, 490, 30, { align: 'center', weight: 700 });
      const pulse = (w: Pt[], v: number) => {
        if (!v) return;
        line(ctx, w, 'rgba(235,164,44,0.55)', 5);
        const [x, y] = along(w, u);
        glow(ctx, x, y, 20, '255,205,110', 0.9);
      };
      fromA.forEach((w) => pulse(w, a));
      fromB.forEach((w) => pulse(w, b));
      const out = smooth(0.6, 1, local);
      if (local > 0.6) {
        pulse(sumWire, sum);
        pulse(carryWire, carry);
      }
      lampLit(ctx, 1190, 240, 38, sum * out);
      lampLit(ctx, 1190, 480, 38, carry * out);
      text(ctx, st, String(sum), 1190, 253, 38, { align: 'center', weight: 700, alpha: out });
      text(ctx, st, String(carry), 1190, 493, 38, { align: 'center', weight: 700, alpha: out });
      text(ctx, st, `${a} + ${b} = ${carry}${sum} in binary = ${value}`, 800, 615, 38, { align: 'center', weight: 700, colour: PAINT.ultramarine, alpha: out });
      // The table so far, this row marked.
      table.forEach((q, i) => {
        if (i > row && st.alive < 4 * 2.8) return;
        const y = 700 + i * 30;
        if (i === row) {
          ctx.fillStyle = 'rgba(235,164,44,0.22)';
          ctx.fillRect(520, y - 24, 590, 30);
        }
        [q.a, q.b, q.carry, q.sum, q.value].forEach((v, j) => text(ctx, st, String(v), TX[j], y, 26, { align: 'center', weight: i === row ? 700 : 500 }));
      });
    },
  };
}

/**
 * The processor. A four-line program runs: each instruction fetched from
 * memory along the bus, decoded, and executed — the registers inside the core
 * changing, and the answer written back to memory.
 */
function cpuScene(r: Rng): SceneArt {
  const k = new Kit(r);
  const run = runProgram();
  // Memory: the program, then the data.
  const MX = 200;
  const MY = 150;
  const ROW = 58;
  k.rect(MX, MY, 280, ROW * 7, { width: 1.1 });
  for (let i = 1; i < 7; i++) k.line([MX, MY + i * ROW], [MX + 280, MY + i * ROW], { width: i === 4 ? 1 : 0.5, tone: i === 4 ? 0.8 : 0.45 });
  k.paint(rectPts(MX, MY, 280, ROW * 4), PAINT.sky, { layers: 8, alpha: 0.08 });
  k.paint(rectPts(MX, MY + ROW * 4, 280, ROW * 3), PAINT.pale, { layers: 8, alpha: 0.1 });
  // The bus.
  k.line([490, 330], [640, 330], { width: 1.1 });
  k.line([490, 350], [640, 350], { width: 1.1 });
  // The chip: four cores, the first drawn open — its registers and its adder.
  k.rect(650, 150, 440, 440, { width: 1.4 });
  for (let i = 0; i < 12; i++) {
    const o = 170 + i * 35;
    k.line([o + 500, 150], [o + 500, 122], { width: 0.6 });
    k.line([o + 500, 590], [o + 500, 618], { width: 0.6 });
  }
  k.paint(rectPts(650, 150, 440, 440), PAINT.grey, { layers: 10, alpha: 0.1 });
  const cores = [[680, 180, 250, 250], [950, 180, 110, 250], [680, 450, 250, 110], [950, 450, 110, 110]] as const;
  cores.forEach(([x, y, w, h], i) => {
    k.rect(x, y, w, h, { width: 1 });
    k.paint(rectPts(x, y, w, h), PAINT.nvidia, { layers: 8, alpha: i === 0 ? 0.1 : 0.06 });
  });
  k.rect(700, 250, 100, 50, { width: 0.9 });
  k.rect(700, 320, 100, 50, { width: 0.9 });
  k.circle(870, 310, 40, { width: 0.9 });
  // The clock.
  const wave: Pt[] = [];
  for (let i = 0; i < 12; i++) {
    const x0 = 300 + i * 85;
    wave.push([x0, 720], [x0, 670], [x0 + 42, 670], [x0 + 42, 720]);
  }
  k.path(wave, { width: 0.9, overshoot: 0 });
  const TICK = 0.95;
  const steps = ['fetch', 'decode', 'execute'];
  return {
    ink: k.ink,
    washes: k.washes,
    focus: { x: 170, y: 100, w: 1300, h: 640 },
    live(ctx, st) {
      run.steps.forEach((s, i) => write(ctx, st, s.text, MX + 20, MY + 38 + i * ROW, 26, { at: -1.6 + i * 0.15 }));
      write(ctx, st, 'memory', MX + 140, MY - 16, 28, { at: -1.5, align: 'center', colour: PAINT.grey });
      write(ctx, st, 'CPU', 870, 140, 32, { at: -1.4, align: 'center', weight: 700 });
      write(ctx, st, 'core', 805, 215, 26, { at: -1.3, align: 'center', colour: PAINT.green });
      write(ctx, st, 'adder', 870, 372, 22, { at: -1.2, align: 'center', colour: PAINT.grey });
      write(ctx, st, 'clock', 1340, 705, 30, { at: -1 });
      if (st.alive < 0) return;
      const tick = Math.floor(st.alive / TICK);
      const into = cyc(st.alive, TICK) / TICK;
      const inst = Math.floor(tick / 3) % run.steps.length;
      const step = tick % 3;
      const s = run.steps[inst];
      const done = step === 2 && into > 0.4;
      const state = done ? s : inst > 0 ? run.steps[inst - 1] : { R1: null, R2: null, sum: null };
      // The data in memory.
      text(ctx, st, `a = ${run.a}`, MX + 20, MY + 38 + 4 * ROW, 26);
      text(ctx, st, `b = ${run.b}`, MX + 20, MY + 38 + 5 * ROW, 26);
      text(ctx, st, `sum = ${state.sum ?? '?'}`, MX + 20, MY + 38 + 6 * ROW, 26, { weight: state.sum !== null ? 700 : 600, colour: state.sum !== null ? PAINT.red : PAINT.ink });
      // The program counter points at the instruction.
      text(ctx, st, '▶', MX - 30, MY + 38 + inst * ROW, 24, { colour: PAINT.red });
      text(ctx, st, 'PC', MX - 58, MY + 38 + inst * ROW, 20, { colour: PAINT.red });
      ctx.fillStyle = 'rgba(235,164,44,0.25)';
      ctx.fillRect(MX + 2, MY + 2 + inst * ROW, 276, ROW - 4);
      // Fetch: the instruction travels along the bus.
      if (step === 0) {
        const x = 490 + into * 200;
        bubble(ctx, st, s.text, x, 300, 20, 1 - smooth(0.85, 1, into), PAINT.pale);
      }
      // The registers.
      const reg = (label: string, v: number | null, y: number, hot: boolean) => {
        text(ctx, st, `${label} = ${v ?? '–'}`, 750, y, 26, { align: 'center', weight: 700, colour: hot ? PAINT.red : PAINT.ink });
      };
      reg('R1', state.R1, 284, done && (inst === 0 || inst === 2));
      reg('R2', state.R2, 354, done && inst === 1);
      if (step === 2 && inst === 2) glow(ctx, 870, 310, 70, '255,205,110', 0.8 * Math.sin(into * Math.PI));
      // The three steps, the one under way marked.
      steps.forEach((n, i) => text(ctx, st, n, 1140, 260 + i * 70, 36, { weight: i === step ? 700 : 500, colour: i === step ? PAINT.red : PAINT.grey }));
      text(ctx, st, step === 0 ? `read “${s.text}”` : step === 1 ? `it means: ${s.does}` : 'done', 1140, 500, 26, { colour: PAINT.ultramarine });
      const x = 300 + cyc(st.alive / TICK, 12) * 85 + 21;
      dot(ctx, x, 662, 8, PAINT.red, 0.9);
    },
  };
}

/**
 * C++ to the metal. A line of C++ compiled to four instructions, the add
 * encoded as two bytes, and the second byte opened up field by field — the
 * mode, the source register and the destination register — down to the
 * sixteen switches that hold them.
 */
function metalScene(r: Rng): SceneArt {
  const k = new Kit(r);
  const code = encodeAdd();
  const f = modrmFields();
  const cards = [
    { x: 150, w: 250, label: 'C++', colour: PAINT.sky },
    { x: 460, w: 330, label: 'assembly', colour: PAINT.orange },
    { x: 850, w: 210, label: 'machine code', colour: PAINT.nvidia },
    { x: 1120, w: 250, label: 'bits', colour: PAINT.pale },
  ];
  for (const c of cards) {
    k.rect(c.x, 130, c.w, 190, { width: 1.2 });
    k.paint(rectPts(c.x, 130, c.w, 190), c.colour, { layers: 10, alpha: 0.09 });
  }
  for (let i = 0; i < 3; i++) k.arrow([cards[i].x + cards[i].w + 8, 225], [cards[i + 1].x - 8, 225], { width: 1 });
  const bits = code.bits.join('').split('').map(Number);
  const LX = (i: number) => 350 + i * 58 + (i >= 8 ? 40 : 0);
  bits.forEach((_, i) => lampArt(k, LX(i), 640, 18));
  const FIELDS = [
    { s: f.opcode, x: 560, label: 'opcode: ADD', colour: PAINT.orange },
    { s: f.mod, x: 820, label: 'mod: two registers', colour: PAINT.violet },
    { s: f.reg, x: 960, label: 'reg: ebx (from)', colour: PAINT.green },
    { s: f.rm, x: 1100, label: 'r/m: eax (into)', colour: PAINT.red },
  ];
  return {
    ink: k.ink,
    washes: k.washes,
    focus: { x: 130, y: 70, w: 1270, h: 660 },
    live(ctx, st) {
      cards.forEach((c, i) => write(ctx, st, c.label, c.x + c.w / 2, 115, 28, { at: -1.4 + i * 0.1, align: 'center', colour: PAINT.grey }));
      if (st.alive < 0) return;
      const t = cyc(st.alive, 16);
      const T = at(st, t);
      write(ctx, T, code.source, cards[0].x + cards[0].w / 2, 235, 28, { at: 0, align: 'center', weight: 700 });
      write(ctx, T, 'compile', (cards[0].x + cards[0].w + cards[1].x) / 2, 205, 20, { at: 0.8, align: 'center', colour: PAINT.grey });
      ASSEMBLY.forEach((a, i) => {
        const hot = a === code.assembly && t > 3.2;
        if (hot) {
          ctx.fillStyle = 'rgba(235,164,44,0.3)';
          ctx.fillRect(cards[1].x + 10, 160 + i * 40, cards[1].w - 20, 36);
        }
        write(ctx, T, a, cards[1].x + 22, 186 + i * 40, 24, { at: 1.2 + i * 0.45, weight: hot ? 700 : 600 });
      });
      write(ctx, T, 'encode', (cards[1].x + cards[1].w + cards[2].x) / 2, 205, 20, { at: 3.4, align: 'center', colour: PAINT.grey });
      write(ctx, T, code.hex.join('  '), cards[2].x + cards[2].w / 2, 240, 40, { at: 3.8, align: 'center', weight: 700 });
      write(ctx, T, code.bits[0], cards[3].x + cards[3].w / 2, 215, 30, { at: 4.8, align: 'center', weight: 700 });
      write(ctx, T, code.bits[1], cards[3].x + cards[3].w / 2, 260, 30, { at: 5.2, align: 'center', weight: 700 });
      // The two bytes, opened up.
      const open = smooth(6, 6.8, t);
      if (open > 0) {
        FIELDS.forEach((q, i) => {
          const a = smooth(6 + i * 0.5, 6.6 + i * 0.5, t);
          const w = width(ctx, st, q.s, 40, 700);
          ctx.fillStyle = q.colour;
          ctx.globalAlpha = 0.18 * a;
          ctx.fillRect(q.x - w / 2 - 8, 392, w + 16, 52);
          ctx.globalAlpha = 1;
          text(ctx, st, q.s, q.x, 432, 40, { align: 'center', weight: 700, alpha: a });
          line(ctx, [[q.x - w / 2, 454], [q.x - w / 2, 462], [q.x + w / 2, 462], [q.x + w / 2, 454]], q.colour, 2, a);
          text(ctx, st, q.label, q.x, i % 2 ? 530 : 496, 24, { align: 'center', colour: q.colour, weight: 700, alpha: a });
        });
        text(ctx, st, `${code.hex[0]} =`, 420, 432, 32, { align: 'center', colour: PAINT.grey, alpha: open });
        text(ctx, st, `${code.hex[1]} =`, 700, 432, 32, { align: 'center', colour: PAINT.grey, alpha: open });
      }
      // Sixteen switches.
      bits.forEach((b, i) => {
        const a = 9 + i * 0.12;
        lampLit(ctx, LX(i), 640, 18, b * smooth(a, a + 0.25, t));
        text(ctx, st, String(b), LX(i), 692, 24, { align: 'center', weight: 700, colour: b ? PAINT.ultramarine : PAINT.grey, alpha: smooth(a, a + 0.25, t) });
      });
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

/**
 * Matrix multiplication. Each answer made in front of you — the row and the
 * column lit, each pair multiplied, the products added, the sum carried into
 * its cell — and then all four at once, as a GPU does it.
 */
function matmulScene(r: Rng): SceneArt {
  const k = new Kit(r);
  const mm = matmul();
  const cell = 110;
  const grids = { A: 250, B: 620, C: 1030 };
  const Y = 170;
  for (const x of Object.values(grids)) {
    for (let i = 0; i <= 2; i++) {
      k.line([x, Y + i * cell], [x + cell * 2, Y + i * cell], { width: 1 });
      k.line([x + i * cell, Y], [x + i * cell, Y + cell * 2], { width: 1 });
    }
  }
  k.paint(rectPts(grids.A, Y, cell * 2, cell * 2), PAINT.sky, { layers: 8, alpha: 0.08 });
  k.paint(rectPts(grids.B, Y, cell * 2, cell * 2), PAINT.orange, { layers: 8, alpha: 0.07 });
  k.paint(rectPts(grids.C, Y, cell * 2, cell * 2), PAINT.nvidia, { layers: 8, alpha: 0.07 });
  const put = (ctx: CanvasRenderingContext2D, st: LiveState, x0: number, M: number[][], a: number) =>
    M.forEach((row, i) => row.forEach((v, j) => write(ctx, st, String(v), x0 + j * cell + cell / 2, Y + i * cell + cell / 2 + 16, 48, { at: a, align: 'center', weight: 700 })));
  const EACH = 3;
  return {
    ink: k.ink,
    washes: k.washes,
    focus: { x: 220, y: 110, w: 1160, h: 640 },
    live(ctx, st) {
      write(ctx, st, 'A', grids.A + cell, Y - 22, 34, { at: -1.4, align: 'center', colour: PAINT.grey });
      write(ctx, st, 'B', grids.B + cell, Y - 22, 34, { at: -1.4, align: 'center', colour: PAINT.grey });
      write(ctx, st, 'C = A × B', grids.C + cell, Y - 22, 34, { at: -1.4, align: 'center', colour: PAINT.grey });
      write(ctx, st, '×', 555, Y + cell + 18, 56, { at: -1.2, align: 'center' });
      write(ctx, st, '=', 945, Y + cell + 18, 56, { at: -1.2, align: 'center' });
      put(ctx, st, grids.A, mm.A, -1);
      put(ctx, st, grids.B, mm.B, -0.8);
      if (st.alive < 0) return;
      const t = cyc(st.alive, 4 * EACH + 3.5);
      const together = t >= 4 * EACH;
      for (let i = 0; i < 2; i++)
        for (let j = 0; j < 2; j++) {
          const idx = i * 2 + j;
          const local = t - idx * EACH;
          const active = together || (local >= 0 && local < EACH);
          if (active) {
            ctx.fillStyle = 'rgba(235,164,44,0.22)';
            ctx.fillRect(grids.A, Y + i * cell, cell * 2, cell);
            ctx.fillRect(grids.B + j * cell, Y, cell, cell * 2);
            ctx.fillStyle = 'rgba(118,168,58,0.3)';
            ctx.fillRect(grids.C + j * cell, Y + i * cell, cell, cell);
          }
          const cx = grids.C + j * cell + cell / 2;
          const cy = Y + i * cell + cell / 2 + 16;
          if (together || local >= EACH - 0.4) text(ctx, st, String(mm.C[i][j]), cx, cy, 48, { align: 'center', weight: 700 });
          if (!together && local >= 0 && local < EACH) {
            // The pairs, multiplied; the products, added; the sum carried to its cell.
            const p = mm.A[i].map((a, q) => ({ a, b: mm.B[q][j], ab: a * mm.B[q][j] }));
            p.forEach((q, n) => text(ctx, st, `${q.a} × ${q.b} = ${q.ab}`, 560 + n * 240, 520, 40, { align: 'center', weight: 700, colour: PAINT.ultramarine, alpha: smooth(0.3 + n * 0.5, 0.6 + n * 0.5, local) }));
            text(ctx, st, `c${'₁₂'[i]}${'₁₂'[j]} = ${p.map((q) => q.ab).join(' + ')} = ${mm.C[i][j]}`, 680, 600, 44, { align: 'center', weight: 700, alpha: smooth(1.4, 1.7, local) });
            const fly = smooth(2, 2.6, local);
            if (fly > 0 && fly < 1) text(ctx, st, String(mm.C[i][j]), 900 + (cx - 900) * fly, 600 + (cy - 600) * fly, 48, { align: 'center', weight: 700, colour: PAINT.red });
          }
        }
      if (together) text(ctx, st, 'on a GPU: four threads, all four answers at once', 800, 560, 40, { align: 'center', weight: 700, colour: PAINT.green, alpha: smooth(4 * EACH, 4 * EACH + 0.4, t) });
    },
  };
}

/**
 * A neuron. Each input travels along its weight — thick where it matters,
 * red where it counts against — and arrives as its product; the sum builds
 * up, the bias nudges it, and the total climbs the sigmoid to the output.
 */
function neuronScene(r: Rng): SceneArt {
  const k = new Kit(r);
  const n = neuron();
  const ins: Pt[] = [[300, 220], [300, 380], [300, 540]];
  const N: Pt = [760, 380];
  const ends = ins.map(([, y]) => [N[0] - 80, N[1] + (y - N[1]) * 0.25] as Pt);
  ins.forEach(([x, y], i) => {
    k.circle(x, y, 44, { width: 1.1 });
    k.paint(circlePts(x, y, 42, 24), PAINT.sky, { layers: 8, alpha: 0.1 });
    k.line([x + 46, y], ends[i], { width: 0.8, tone: 0.5 });
  });
  k.circle(N[0], N[1], 80, { width: 1.4 });
  k.paint(circlePts(N[0], N[1], 78, 30), PAINT.orange, { layers: 10, alpha: 0.09 });
  k.arrow([N[0], 620], [N[0], 468], { width: 0.9 });
  k.arrow([N[0] + 82, N[1]], [980, N[1]], { width: 1.1 });
  const plot = { x: 1000, y: 240, w: 300, h: 280 };
  k.line([plot.x, plot.y + plot.h], [plot.x + plot.w, plot.y + plot.h], { width: 0.8, tone: 0.5 });
  k.line([plot.x + plot.w / 2, plot.y], [plot.x + plot.w / 2, plot.y + plot.h], { width: 0.8, tone: 0.5 });
  const Z = (z: number) => plot.x + ((z + 6) / 12) * plot.w;
  const S = (v: number) => plot.y + plot.h - v * plot.h;
  const sig: Pt[] = Array.from({ length: 41 }, (_, i) => [Z(-6 + i * 0.3), S(sigmoid(-6 + i * 0.3))]);
  k.path(sig, { width: 1.3, overshoot: 0 });
  const products = n.x.map((x, i) => x * n.w[i]);
  const running = products.map((_, i) => products.slice(0, i + 1).reduce((a, b) => a + b, 0));
  return {
    ink: k.ink,
    washes: k.washes,
    focus: { x: 220, y: 130, w: 1200, h: 600 },
    live(ctx, st) {
      ins.forEach(([x, y], i) => {
        write(ctx, st, `x${'₁₂₃'[i]} = ${n.x[i]}`, x, y + 12, 26, { at: -1.4, align: 'center', weight: 700 });
        write(ctx, st, `w${'₁₂₃'[i]} = ${fmt2(n.w[i])}`, (x + N[0]) / 2 - 40, (y + N[1]) / 2 - (i === 0 ? 34 : 16), 26, { at: -1.2, align: 'center', colour: PAINT.grey });
      });
      write(ctx, st, 'Σ', N[0], N[1] + 22, 64, { at: -1, align: 'center', weight: 700 });
      write(ctx, st, `bias b = ${fmt2(n.b)}`, N[0], 660, 28, { at: -1, align: 'center', colour: PAINT.grey });
      write(ctx, st, 'sigmoid', plot.x + plot.w / 2, plot.y - 18, 28, { at: -0.8, align: 'center', colour: PAINT.grey });
      // The weights, as thick as they matter, red where they count against.
      ins.forEach(([x, y], i) => line(ctx, [[x + 46, y], ends[i]], n.w[i] >= 0 ? 'rgba(43,63,158,0.55)' : 'rgba(207,63,44,0.6)', 1.5 + Math.abs(n.w[i]) * 9, 1));
      if (st.alive < 0) return;
      const t = cyc(st.alive, 12);
      let z: number | null = null;
      ins.forEach(([x, y], i) => {
        const go = 0.3 + i * 1.1;
        const u = smooth(go, go + 0.8, t);
        if (u > 0 && u < 1) glow(ctx, x + 46 + (ends[i][0] - x - 46) * u, y + (ends[i][1] - y) * u, 20, '255,205,110', 0.9);
        const arrived = smooth(go + 0.8, go + 1, t);
        if (arrived > 0) {
          text(ctx, st, `${n.x[i]} × ${n.w[i] < 0 ? `(${fmt2(n.w[i])})` : fmt2(n.w[i])} = ${fmt2(products[i])}`, x, y + 76, 22, { align: 'center', weight: 700, colour: products[i] >= 0 ? PAINT.ultramarine : PAINT.red, alpha: arrived });
          z = running[i];
        }
      });
      const bias = smooth(3.8, 4.4, t);
      if (bias > 0) {
        glow(ctx, N[0], 620 - 150 * bias, 20, '255,205,110', 0.9 * (1 - bias));
        if (bias >= 1) z = n.z;
      }
      if (z !== null) text(ctx, st, `z = ${fmt2(z)}`, N[0], N[1] - 100, 38, { align: 'center', weight: 700, colour: PAINT.ultramarine });
      // The total goes up the curve.
      const climb = smooth(5, 6.4, t);
      if (climb > 0) {
        const zx = Z(n.z);
        const zy = S(sigmoid(n.z));
        glow(ctx, 900 + (zx - 900) * smooth(0, 0.4, climb), N[1], 18, '255,205,110', 0.9 * (1 - smooth(0.3, 0.45, climb)));
        ctx.setLineDash([6, 6]);
        line(ctx, [[zx, plot.y + plot.h], [zx, plot.y + plot.h - (plot.y + plot.h - zy) * smooth(0.4, 1, climb)]], 'rgba(29,29,33,0.5)', 1.5);
        ctx.setLineDash([]);
        if (climb >= 1) {
          dot(ctx, zx, zy, 9, PAINT.red);
          write(ctx, at(st, t), `output ${n.y}`, zx + 16, zy - 16, 34, { at: 6.4, weight: 700, colour: PAINT.red });
        }
      }
    },
  };
}

/**
 * Learning. A ball on the loss curve steps downhill: at each step the slope
 * is read off the tangent, the step it gives is drawn, and the ball lands a
 * little lower, leaving a trail — until it settles at the bottom.
 */
function learningScene(r: Rng): SceneArt {
  const k = new Kit(r);
  const gd = descent();
  const plot = { x: 300, y: 150, w: 1000, h: 500 };
  const wMin = -1;
  const wMax = 6;
  const lMax = 16;
  const X = (w: number) => plot.x + ((w - wMin) / (wMax - wMin)) * plot.w;
  const Y = (l: number) => plot.y + plot.h - (l / lMax) * plot.h;
  k.arrow([plot.x, plot.y + plot.h], [plot.x + plot.w + 30, plot.y + plot.h], { width: 1 });
  k.arrow([plot.x, plot.y + plot.h], [plot.x, plot.y - 20], { width: 1 });
  const pts: Pt[] = Array.from({ length: 57 }, (_, i) => {
    const w = wMin + (i / 56) * (wMax - wMin);
    return [X(w), Y(loss(w))];
  });
  k.path(pts, { width: 1.4, overshoot: 0 });
  k.paint([...pts, [X(wMax), Y(0)], [X(wMin), Y(0)]], PAINT.sky, { layers: 10, alpha: 0.07, spread: 0.08 });
  const PER = 1.6;
  return {
    ink: k.ink,
    washes: k.washes,
    focus: { x: 220, y: 110, w: 1180, h: 620 },
    live(ctx, st) {
      write(ctx, st, `loss = (w − ${TARGET})²`, plot.x + 12, plot.y - 10, 30, { at: -1.4, colour: PAINT.grey });
      write(ctx, st, 'weight w', plot.x + plot.w, plot.y + plot.h + 44, 30, { at: -1.3, align: 'right', colour: PAINT.grey });
      write(ctx, st, `lowest at w = ${TARGET}`, X(TARGET), Y(0) + 44, 28, { at: -1, align: 'center', colour: PAINT.green });
      if (st.alive < 0) return;
      const t = cyc(st.alive, PER * (gd.steps.length + 1.5));
      const i = Math.min(gd.steps.length - 1, Math.floor(t / PER));
      const f = smooth(0.35, 0.95, (t % PER) / PER);
      const a = gd.steps[i];
      const b = gd.steps[Math.min(gd.steps.length - 1, i + 1)];
      const moving = i < gd.steps.length - 1;
      const w = moving ? a.w + (b.w - a.w) * f : a.w;
      // The trail of where it has been.
      for (let j = 0; j < i; j++) dot(ctx, X(gd.steps[j].w), Y(gd.steps[j].loss) - 6, 6, PAINT.red, 0.35);
      // The slope where it stands: the tangent line, and the number.
      const s = 2 * (a.w - TARGET);
      line(ctx, [[X(a.w - 0.8), Y(a.loss - s * 0.8)], [X(a.w + 0.8), Y(a.loss + s * 0.8)]], 'rgba(207,63,44,0.6)', 2);
      if (moving) {
        // The step it gives: −rate × slope, drawn along the axis.
        const step = b.w - a.w;
        line(ctx, [[X(a.w), plot.y + plot.h - 20], [X(a.w) + (X(b.w) - X(a.w)) * smooth(0, 0.35, (t % PER) / PER), plot.y + plot.h - 20]], PAINT.ultramarine, 3);
        text(ctx, st, `slope ${fmt2(a.slope)} → step ${RATE} × ${fmt2(-a.slope)} = ${fmt2(step)}`, 800, 250, 30, { align: 'center', weight: 700, colour: PAINT.ultramarine });
      }
      const hop = moving ? Math.sin(f * Math.PI) * 30 : 0;
      dot(ctx, X(w), Y(loss(w)) - 14 - hop, 14, PAINT.red);
      text(ctx, st, `step ${i}:  w = ${a.w},  loss = ${a.loss}`, 1000, 200, 34, { align: 'center', weight: 700 });
      text(ctx, st, `w: ${gd.steps.slice(0, i + 1).map((q) => q.w).join(' → ')}`, 1000, 300, 24, { align: 'center', colour: PAINT.grey });
    },
  };
}

/**
 * A language model. The last word looks back at every word before it (and
 * itself) — attention — then every candidate gets a score, the softmax turns
 * the scores into probabilities, and the likeliest word is written in.
 */
function languageScene(r: Rng): SceneArt {
  const k = new Kit(r);
  const probs = softmax();
  const att = attention();
  const TX = (i: number) => 200 + i * 150;
  const TY = 440;
  const tiles = [...CONTEXT, '?'];
  tiles.forEach((_, i) => {
    k.rect(TX(i), TY, 130, 70, { width: 1 });
    k.paint(rectPts(TX(i), TY, 130, 70), i === tiles.length - 1 ? PAINT.orange : PAINT.pale, { layers: 8, alpha: 0.12 });
  });
  const bars = { x: 1180, y: 170, w: 220 };
  const zero = bars.x + 50;
  k.line([zero, bars.y - 10], [zero, bars.y + CANDIDATES.length * 90], { width: 0.6, tone: 0.4 });
  const maxScore = Math.max(...CANDIDATES.map((c) => c.score));
  return {
    ink: k.ink,
    washes: k.washes,
    focus: { x: 180, y: 90, w: 1260, h: 620 },
    live(ctx, st) {
      const t = st.alive < 0 ? 0 : cyc(st.alive, 13);
      const put = smooth(8.4, 9.2, t);
      tiles.forEach((w, i) => write(ctx, st, w, TX(i) + 65, TY + 46, 32, { at: -1.4 + i * 0.12, align: 'center', weight: 700, alpha: i === tiles.length - 1 ? 1 - put : 1 }));
      if (st.alive < 0) return;
      const from = TX(4) + 65;
      // Attention: arcs back from the last word, as thick as it attends — never forward.
      att.forEach((a, i) => {
        const p = smooth(0.3 + i * 0.25, 1 + i * 0.25, t);
        if (p <= 0) return;
        const to = TX(i) + 65;
        ctx.strokeStyle = `rgba(43,63,158,${(0.25 + a * 0.9).toFixed(3)})`;
        ctx.lineWidth = 2 + a * 22;
        ctx.beginPath();
        if (to === from) {
          ctx.ellipse(from, TY - 46, 22, 36, 0, Math.PI / 2, Math.PI / 2 + Math.PI * 2 * p);
        } else {
          const h = 80 + Math.abs(from - to) * 0.35;
          const n = 30;
          for (let s = 0; s <= n * p; s++) {
            const u = s / n;
            const x = from + (to - from) * u;
            const y = TY - 6 - Math.sin(u * Math.PI) * h;
            if (s === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
        }
        ctx.stroke();
        text(ctx, st, `${Math.round(a * 100)}%`, to === from ? from + 40 : to, to === from ? TY - 60 : TY - 14, 22, { align: 'center', colour: PAINT.ultramarine, alpha: smooth(0.8, 1, p) });
      });
      write(ctx, at(st, t), '“the” looks back at every word so far', 560, 620, 28, { at: 1.8, align: 'center', colour: PAINT.ultramarine });
      // Scores, then — through the softmax — probabilities.
      const into = smooth(6, 7.2, t);
      write(ctx, at(st, t), into < 0.5 ? 'scores' : 'probabilities', bars.x + bars.w / 2, bars.y - 30, 30, { at: 3.4, align: 'center', colour: PAINT.grey });
      probs.forEach((p, i) => {
        const g = smooth(3.4 + i * 0.2, 4.2 + i * 0.2, t);
        if (g <= 0) return;
        const y = bars.y + i * 90;
        const score = ((p.score / maxScore) * (bars.w - 60)) * g;
        const prob = p.p * (bars.w - 50) * g;
        const len = score + (prob - score) * into;
        ctx.fillStyle = i === 0 ? 'rgba(224,138,43,0.7)' : 'rgba(143,179,217,0.7)';
        ctx.fillRect(len >= 0 ? zero : zero + len, y + 22, Math.abs(len), 34);
        text(ctx, st, `${p.word}  ${into < 0.5 ? fmt2(p.score) : `${p.percent}%`}`, bars.x - 40, y + 12, 28, { weight: 700 });
      });
      if (into > 0 && into < 1) text(ctx, st, 'softmax', bars.x + bars.w / 2, bars.y + 4 * 90 + 20, 30, { align: 'center', weight: 700, colour: PAINT.red, alpha: Math.sin(into * Math.PI) });
      // The pick, written into the blank.
      if (put > 0) {
        const x = bars.x + (TX(5) + 65 - bars.x) * put;
        const y = bars.y + 40 + (TY + 46 - bars.y - 40) * put;
        text(ctx, st, probs[0].word, x, y, 34, { align: 'center', weight: 700, colour: PAINT.red });
      }
      write(ctx, at(st, t), `“The cat sat on the ${probs[0].word}” — and again, for the next word`, 700, 680, 30, { at: 9.6, align: 'center', weight: 700 });
    },
  };
}

/**
 * An agent. A model in a loop with a tool, doing a real task: asked a sum, it
 * decides to use the calculator, calls it, reads the result, and answers.
 */
function agentScene(r: Rng): SceneArt {
  const k = new Kit(r);
  const job = agentRun();
  const nodes = {
    goal: [300, 390] as Pt,
    model: [800, 190] as Pt,
    tools: [1100, 420] as Pt,
    observe: [800, 620] as Pt,
    answer: [1330, 190] as Pt,
  };
  const colours: Record<keyof typeof nodes, string> = { goal: PAINT.pale, model: PAINT.orange, tools: PAINT.nvidia, observe: PAINT.sky, answer: PAINT.yellow };
  (Object.keys(nodes) as (keyof typeof nodes)[]).forEach((id) => {
    const [x, y] = nodes[id];
    k.circle(x, y, 70, { width: 1.3 });
    k.paint(circlePts(x, y, 68, 30), colours[id], { layers: 10, alpha: 0.1 });
  });
  const legs = {
    ask: curve([nodes.goal, [520, 250], nodes.model], 30),
    plan: curve([nodes.model, [1010, 250], nodes.tools], 30),
    act: curve([nodes.tools, [1010, 580], nodes.observe], 30),
    back: curve([nodes.observe, [590, 420], nodes.model], 30),
    answer: curve([nodes.model, [1060, 150], nodes.answer], 30),
  };
  const outside = (p: Pt) => Object.values(nodes).every(([x, y]) => Math.hypot(p[0] - x, p[1] - y) > 76);
  for (const leg of Object.values(legs)) {
    const kept = leg.filter(outside);
    if (kept.length > 1) k.arrow(kept[kept.length - 2], kept[kept.length - 1], { width: 1, overshoot: 0 });
    k.path(kept, { width: 1, overshoot: 0 });
  }
  // The story, beat by beat: which leg the signal travels, and what is said.
  const beats: { leg: keyof typeof legs; from: number; say: string; where: Pt }[] = [
    { leg: 'ask', from: 0.4, say: job.question, where: [nodes.goal[0], nodes.goal[1] - 110] },
    { leg: 'plan', from: 2.2, say: 'I should use the calculator', where: [nodes.model[0] - 40, nodes.model[1] - 100] },
    { leg: 'act', from: 4.2, say: job.call, where: [nodes.tools[0] + 60, nodes.tools[1] + 110] },
    { leg: 'back', from: 6.2, say: `it says ${job.result}`, where: [nodes.observe[0], nodes.observe[1] + 110] },
    { leg: 'answer', from: 8.2, say: `${TASK.x} × ${TASK.y} = ${job.result}`, where: [nodes.answer[0], nodes.answer[1] + 110] },
  ];
  return {
    ink: k.ink,
    washes: k.washes,
    focus: { x: 200, y: 60, w: 1260, h: 700 },
    live(ctx, st) {
      const label = (id: keyof typeof nodes, s: string) => write(ctx, st, s, nodes[id][0], nodes[id][1] + 10, 30, { at: -1.3, align: 'center', weight: 700 });
      label('goal', 'goal');
      label('model', 'model');
      label('tools', 'tools');
      label('observe', 'observe');
      label('answer', 'answer');
      if (st.alive < 0) return;
      const t = cyc(st.alive, 12.5);
      beats.forEach((b, i) => {
        const u = smooth(b.from, b.from + 1.5, t);
        if (u > 0 && u < 1) {
          const [x, y] = along(legs[b.leg], u);
          glow(ctx, x, y, 34, '255,205,110', 0.95);
        }
        const show = smooth(b.from + 0.2, b.from + 0.6, t) * (1 - smooth(11.6, 12.3, t));
        bubble(ctx, st, b.say, b.where[0], b.where[1], 24, show, i === beats.length - 1 ? '#fbeec9' : PAINT.pale);
        // The node the signal reaches glows.
        const reached = legs[b.leg][legs[b.leg].length - 1];
        glow(ctx, reached[0], reached[1], 110, '255,205,110', 0.35 * Math.sin(clamp((t - b.from - 1.4) / 0.8) * Math.PI));
      });
    },
  };
}

const BUILDERS: Partial<Record<SceneId, (r: Rng) => SceneArt>> = {
  binary,
  switch: switchScene,
  byte: byteScene,
  logic: logicScene,
  cpu: cpuScene,
  metal: metalScene,
  gpu: gpuScene,
  matmul: matmulScene,
  neuron: neuronScene,
  learning: learningScene,
  language: languageScene,
  agent: agentScene,
};

export function buildScene(id: SceneId, seed: number): SceneArt | null {
  const b = BUILDERS[id];
  return b ? b(rng(seed)) : null;
}
