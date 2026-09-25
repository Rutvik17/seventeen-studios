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
import { attention, byteOf, CANDIDATES, CONTEXT, descent, encodeAdd, halfAdder, LETTER, loss, matmul, neuron, sigmoid, softmax, TARGET, WARP } from './facts';

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
 * The scenes                                                          *
 * ------------------------------------------------------------------ */

function binary(r: Rng): SceneArt {
  const k = new Kit(r);
  const scr = { x: 560, y: 150, w: 480, h: 320 };
  k.rect(scr.x, scr.y, scr.w, scr.h, { width: 1.4 });
  k.rect(scr.x + 20, scr.y + 20, scr.w - 40, scr.h - 40, { width: 0.9 });
  const base: Pt[] = [[500, 470], [1100, 470], [1160, 530], [440, 530]];
  k.path([...base, base[0]], { width: 1.3 });
  for (let i = 0; i < 4; i++) k.line([470 + i * 8 + 20, 485 + i * 10], [1130 - i * 8 - 20, 485 + i * 10], { width: 0.5, tone: 0.35 });
  k.line([740, 515], [860, 515], { width: 0.6, tone: 0.4 });
  k.paint(rectPts(scr.x, scr.y, scr.w, scr.h), PAINT.steel, { layers: 8 });
  k.paint(rectPts(scr.x + 20, scr.y + 20, scr.w - 40, scr.h - 40), PAINT.night, { layers: 14, alpha: 0.12 });
  k.paint(base, PAINT.steel, { layers: 8 });
  k.splash(800, 560, 420, 40, PAINT.grey, { alpha: 0.04, layers: 6 });
  const code = ['int main() {', '  int a = 2, b = 3;', '  int sum = a + b;', '  return sum;', '}'];
  const drops = Array.from({ length: 70 }, () => ({ x: between(r, 470, 1130), v: between(r, 50, 110), p: r(), bit: r() < 0.5 ? '0' : '1', s: between(r, 20, 34) }));
  return {
    ink: k.ink,
    washes: k.washes,
    focus: DIAGRAM_FOCUS,
    live(ctx, st) {
      code.forEach((line, i) => write(ctx, st, line, scr.x + 45, scr.y + 75 + i * 50, 30, { at: -1 + i * 0.7, colour: '#e8eef8' }));
      // The characters, once typed, spill out of the screen as the bits they are.
      if (st.alive < 3) return;
      const a = smooth(3, 5, st.alive);
      ctx.save();
      ctx.font = `700 26px ${st.hand}`;
      ctx.textAlign = 'center';
      for (const d of drops) {
        const y = 540 + ((st.alive * d.v + d.p * 240) % 240);
        ctx.globalAlpha = a * (1 - (y - 540) / 240) * 0.9;
        ctx.fillStyle = d.bit === '1' ? PAINT.ultramarine : PAINT.ink;
        ctx.font = `700 ${d.s}px ${st.hand}`;
        ctx.fillText(d.bit, d.x, y);
      }
      ctx.restore();
      // And on the screen, the line's first letter as its bits.
      const bits = byteOf('i').bits.join('');
      write(ctx, st, `'i' = ${bits}`, scr.x + scr.w - 45, scr.y + scr.h - 40, 26, { at: 4, align: 'right', colour: '#ffd27a' });
    },
  };
}

function switchScene(r: Rng): SceneArt {
  const k = new Kit(r);
  // A transistor in cross-section: a slab of silicon, a source and a drain
  // doped into it either side, and the gate sitting over the gap between them
  // on a thin layer of insulating glass.
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
  k.line([800, top - 150], [800, top - 210], { width: 1.1 });
  k.circle(800, top - 222, 14, { width: 1 });
  k.paint(rectPts(260, top, 1000, 170), PAINT.grey, { layers: 8, alpha: 0.06 });
  k.paint(rectPts(src.x0 - 20, top, src.x1 - src.x0 + 20, bot - top), PAINT.sky, { layers: 10, alpha: 0.09 });
  k.paint(rectPts(drn.x0, top, drn.x1 - drn.x0 + 20, bot - top), PAINT.sky, { layers: 10, alpha: 0.09 });
  k.paint(rectPts(src.x1 + 10, top - 150, drn.x0 - src.x1 - 20, 128), PAINT.orange, { layers: 10, alpha: 0.09 });
  // The display that reads the bit.
  k.circle(1400, 250, 90, { width: 1.3 });
  k.paint(circlePts(1400, 250, 88, 30), PAINT.pale, { layers: 8, alpha: 0.12 });
  const electrons = Array.from({ length: 46 }, () => ({ p: r(), y: between(r, top + 10, bot - 14), v: between(r, 0.16, 0.26), home: between(r, src.x0 + 20, src.x1 - 20) }));
  return {
    ink: k.ink,
    washes: k.washes,
    focus: { x: 220, y: 120, w: 1300, h: 600 },
    live(ctx, st) {
      write(ctx, st, 'source', (src.x0 + src.x1) / 2, bot + 60, 32, { at: -1.2, align: 'center' });
      write(ctx, st, 'drain', (drn.x0 + drn.x1) / 2, bot + 60, 32, { at: -1, align: 'center' });
      write(ctx, st, 'gate', 830, top - 225, 32, { at: -0.8 });
      write(ctx, st, 'silicon', 1240, top + 150, 26, { at: -0.8, align: 'right', colour: PAINT.grey });
      write(ctx, st, 'insulating glass', drn.x0 + 20, top - 10, 24, { at: -0.6, colour: PAINT.grey });
      if (st.alive < 0) return;
      // The gate's voltage goes on and off: 2 s each. On, a channel forms under it.
      const phase = st.alive % 4;
      const on = phase < 2 ? smooth(0, 0.35, phase) : 1 - smooth(2, 2.35, phase);
      write(ctx, st, on > 0.5 ? 'voltage on' : 'voltage off', 800, top - 70, 30, { at: 0, align: 'center', weight: 700, colour: on > 0.5 ? PAINT.red : PAINT.grey });
      ctx.fillStyle = `rgba(43,63,158,${(0.35 * on).toFixed(3)})`;
      ctx.fillRect(src.x1, top + 2, drn.x0 - src.x1, 16);
      for (const e of electrons) {
        if (on > 0.5) e.p = (e.p + e.v / 60) % 1;
        const flowing = src.x0 + 10 + e.p * (drn.x1 - src.x0 - 20);
        // Off, an electron that has not reached the drain waits in the source.
        const x = on > 0.5 || flowing > drn.x0 ? flowing : Math.min(flowing, e.home);
        const y = x > src.x1 && x < drn.x0 ? top + 10 : e.y;
        dot(ctx, x, y, 5, PAINT.ultramarine, 0.75);
      }
      glow(ctx, 1400, 250, 150, '255,205,110', 0.5 * on);
      write(ctx, st, on > 0.5 ? '1' : '0', 1400, 285, 110, { at: 0, align: 'center', weight: 700, colour: on > 0.5 ? PAINT.ink : PAINT.grey });
      write(ctx, st, on > 0.5 ? 'current flows' : 'no current', 1400, 390, 30, { at: 0, align: 'center' });
    },
  };
}

function byteScene(r: Rng): SceneArt {
  const k = new Kit(r);
  const byte = byteOf(LETTER);
  const X = (i: number) => 330 + i * 134;
  for (let i = 0; i < 8; i++) lampArt(k, X(i), 360, 44);
  k.line([270, 470], [1330, 470], { width: 0.7, tone: 0.4 });
  return {
    ink: k.ink,
    washes: k.washes,
    focus: DIAGRAM_FOCUS,
    live(ctx, st) {
      byte.places.forEach((p, i) => write(ctx, st, String(p), X(i), 285, 30, { at: -1.4 + i * 0.1, align: 'center', colour: PAINT.grey }));
      if (st.alive < 0) return;
      byte.bits.forEach((b, i) => {
        const at = 0.3 + i * 0.45;
        const on = b ? smooth(at, at + 0.3, st.alive) : 0;
        lampLit(ctx, X(i), 360, 44, on);
        write(ctx, st, String(b), X(i), 540, 52, { at, align: 'center', weight: 700, colour: b ? PAINT.ultramarine : PAINT.grey });
      });
      write(ctx, st, `${byte.on.join(' + ')} = ${byte.code}`, 800, 640, 48, { at: 4.4, align: 'center', weight: 700 });
      write(ctx, st, `in ASCII, ${byte.code} is the letter ${LETTER}`, 800, 710, 40, { at: 6, align: 'center', colour: PAINT.ultramarine });
    },
  };
}

function logicScene(r: Rng): SceneArt {
  const k = new Kit(r);
  const add = halfAdder(1, 1);
  // Inputs.
  lampArt(k, 300, 260, 34);
  lampArt(k, 300, 520, 34);
  // XOR gate at top, AND gate below.
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
      k.path(Array.from({ length: 17 }, (_, i) => [x + w * 0.5 + Math.cos(-Math.PI / 2 + (i / 16) * Math.PI) * h / 2, y + Math.sin(-Math.PI / 2 + (i / 16) * Math.PI) * h / 2] as Pt), { width: 1.2 });
      k.paint([[x, y - h / 2], [x + w * 0.5, y - h / 2], [x + w * 0.5 + h / 2, y], [x + w * 0.5, y + h / 2], [x, y + h / 2]], PAINT.orange, { layers: 10 });
    }
  };
  gate(720, 260, true);
  gate(720, 520, false);
  const wires: Pt[][] = [
    [[334, 260], [520, 260], [520, 235], [730, 235]],
    [[334, 520], [560, 520], [560, 285], [730, 285]],
    [[334, 260], [600, 260], [600, 495], [720, 495]],
    [[334, 520], [640, 520], [640, 545], [720, 545]],
    [[870, 260], [1150, 260]],
    [[855, 520], [1150, 520]],
  ];
  for (const w of wires) k.path(w, { width: 0.9, tone: 0.7, overshoot: 0 });
  lampArt(k, 1190, 260, 38);
  lampArt(k, 1190, 520, 38);
  return {
    ink: k.ink,
    washes: k.washes,
    focus: DIAGRAM_FOCUS,
    live(ctx, st) {
      write(ctx, st, 'A = 1', 300, 190, 32, { at: -1.5, align: 'center' });
      write(ctx, st, 'B = 1', 300, 610, 32, { at: -1.4, align: 'center' });
      write(ctx, st, 'XOR', 785, 270, 30, { at: -1.2, align: 'center', weight: 700 });
      write(ctx, st, 'AND', 790, 530, 30, { at: -1.1, align: 'center', weight: 700 });
      write(ctx, st, 'sum', 1250, 270, 32, { at: -1 });
      write(ctx, st, 'carry', 1250, 530, 32, { at: -1 });
      if (st.alive < 0) return;
      lampLit(ctx, 300, 260, 34, 1);
      lampLit(ctx, 300, 520, 34, 1);
      // Where a wire splits to feed both gates.
      dot(ctx, 520, 260, 6, PAINT.ink);
      dot(ctx, 560, 520, 6, PAINT.ink);
      const u = (st.alive % 2.4) / 2.4;
      wires.slice(0, 4).forEach((w) => {
        const [x, y] = along(w, u);
        glow(ctx, x, y, 22, '255,205,110', 0.8);
      });
      const out = smooth(1.2, 1.8, st.alive);
      if (add.carry) {
        const [x, y] = along(wires[5], u);
        if (st.alive > 1.2) glow(ctx, x, y, 22, '255,205,110', 0.8);
      }
      lampLit(ctx, 1190, 260, 38, add.sum * out);
      lampLit(ctx, 1190, 520, 38, add.carry * out);
      write(ctx, st, String(add.sum), 1190, 273, 38, { at: 1.4, align: 'center', weight: 700 });
      write(ctx, st, String(add.carry), 1190, 533, 38, { at: 1.4, align: 'center', weight: 700 });
      write(ctx, st, `1 + 1 = ${add.binary} in binary = ${add.value}`, 800, 700, 46, { at: 2.4, align: 'center', weight: 700, colour: PAINT.ultramarine });
    },
  };
}

function cpuScene(r: Rng): SceneArt {
  const k = new Kit(r);
  k.rect(600, 170, 420, 420, { width: 1.4 });
  for (let i = 0; i < 12; i++) {
    const o = 190 + i * 33;
    k.line([o + 10, 170], [o + 10, 140], { width: 0.6 });
    k.line([o + 10, 590], [o + 10, 620], { width: 0.6 });
    k.line([600, o], [570, o], { width: 0.6 });
    k.line([1020, o], [1050, o], { width: 0.6 });
  }
  k.paint(rectPts(600, 170, 420, 420), PAINT.grey, { layers: 10, alpha: 0.1 });
  const cores = [[640, 210], [820, 210], [640, 390], [820, 390]] as const;
  for (const [x, y] of cores) {
    k.rect(x, y, 160, 160, { width: 1 });
    k.paint(rectPts(x, y, 160, 160), PAINT.nvidia, { layers: 8, alpha: 0.08 });
  }
  // Memory: a short program on the left.
  k.rect(230, 200, 220, 330, { width: 1.1 });
  for (let i = 1; i < 5; i++) k.line([230, 200 + i * 66], [450, 200 + i * 66], { width: 0.6, tone: 0.5 });
  k.paint(rectPts(230, 200, 220, 330), PAINT.sky, { layers: 8, alpha: 0.08 });
  k.arrow([460, 360], [560, 360], { width: 1 });
  // The clock.
  const wave: Pt[] = [];
  for (let i = 0; i < 12; i++) {
    const x0 = 300 + i * 85;
    wave.push([x0, 720], [x0, 670], [x0 + 42, 670], [x0 + 42, 720]);
  }
  k.path(wave, { width: 0.9, overshoot: 0 });
  const program = ['LOAD a', 'LOAD b', 'ADD', 'STORE sum', '…next'];
  const steps = ['fetch', 'decode', 'execute'];
  return {
    ink: k.ink,
    washes: k.washes,
    focus: { x: 200, y: 110, w: 1260, h: 640 },
    live(ctx, st) {
      program.forEach((p, i) => write(ctx, st, p, 250, 245 + i * 66, 28, { at: -1.6 + i * 0.2 }));
      write(ctx, st, 'memory', 340, 180, 30, { at: -1.5, align: 'center', colour: PAINT.grey });
      write(ctx, st, 'CPU', 810, 130, 34, { at: -1.4, align: 'center', weight: 700 });
      cores.forEach(([x, y]) => write(ctx, st, 'core', x + 80, y + 90, 28, { at: -1.2, align: 'center', colour: PAINT.green }));
      write(ctx, st, 'clock', 1340, 705, 30, { at: -1 });
      if (st.alive < 0) return;
      const tick = Math.floor(st.alive / 0.8);
      const inst = Math.floor(tick / 3) % program.length;
      const step = tick % 3;
      ctx.fillStyle = 'rgba(235,164,44,0.28)';
      ctx.fillRect(232, 202 + inst * 66, 216, 62);
      steps.forEach((s, i) => write(ctx, st, s, 1130, 290 + i * 80, 36, { at: 0, weight: i === step ? 700 : 500, colour: i === step ? PAINT.red : PAINT.grey }));
      glow(ctx, 720, 290, 110, '255,205,110', step === 2 ? 0.5 : 0.15);
      const x = 300 + ((st.alive / 0.8) % 12) * 85 + 21;
      dot(ctx, x, 662, 8, PAINT.red, 0.9);
    },
  };
}

function metalScene(r: Rng): SceneArt {
  const k = new Kit(r);
  const code = encodeAdd();
  const cards = [
    { x: 220, label: 'C++', text: code.source, colour: PAINT.sky },
    { x: 530, label: 'assembly', text: code.assembly, colour: PAINT.orange },
    { x: 840, label: 'machine code', text: code.hex.join('  '), colour: PAINT.nvidia },
    { x: 1150, label: 'bits', text: '', colour: PAINT.pale },
  ];
  for (const c of cards) {
    k.rect(c.x, 220, 250, 170, { width: 1.2 });
    k.paint(rectPts(c.x, 220, 250, 170), c.colour, { layers: 10, alpha: 0.09 });
  }
  for (let i = 0; i < 3; i++) k.arrow([cards[i].x + 262, 305], [cards[i + 1].x - 12, 305], { width: 1 });
  const bits = code.bits.join('').split('').map(Number);
  const LX = (i: number) => 320 + i * 60 + (i >= 8 ? 40 : 0);
  bits.forEach((_, i) => lampArt(k, LX(i), 540, 20));
  return {
    ink: k.ink,
    washes: k.washes,
    focus: { x: 200, y: 150, w: 1240, h: 560 },
    live(ctx, st) {
      const verbs = ['compile', 'encode', '='];
      cards.forEach((c, i) => write(ctx, st, c.label, c.x + 125, 205, 30, { at: -1.4 + i * 0.1, align: 'center', colour: PAINT.grey }));
      verbs.forEach((v, i) => write(ctx, st, v, cards[i].x + 290, 285, 24, { at: -1, align: 'center', colour: PAINT.grey }));
      if (st.alive < 0) return;
      cards.slice(0, 3).forEach((c, i) => write(ctx, st, c.text, c.x + 125, 318, i === 0 ? 30 : 36, { at: i * 1.4, align: 'center', weight: 700 }));
      write(ctx, st, code.bits[0], cards[3].x + 125, 300, 30, { at: 4.2, align: 'center', weight: 700 });
      write(ctx, st, code.bits[1], cards[3].x + 125, 345, 30, { at: 4.5, align: 'center', weight: 700 });
      const u = (st.alive % 1.4) / 1.4;
      const stage = Math.min(2, Math.floor(st.alive / 1.4));
      const a = cards[stage].x + 262;
      glow(ctx, a + (cards[stage + 1].x - 12 - a) * u, 305, 20, '255,205,110', st.alive < 5.6 ? 0.9 : 0);
      bits.forEach((b, i) => {
        const at = 5 + i * 0.12;
        lampLit(ctx, LX(i), 540, 20, b * smooth(at, at + 0.2, st.alive));
        write(ctx, st, String(b), LX(i), 600, 26, { at, align: 'center', weight: 700, colour: b ? PAINT.ultramarine : PAINT.grey });
      });
    },
  };
}

function gpuScene(r: Rng): SceneArt {
  const k = new Kit(r);
  const die = { x: 380, y: 150, w: 840, h: 480 };
  k.rect(die.x, die.y, die.w, die.h, { width: 1.4 });
  k.paint(rectPts(die.x, die.y, die.w, die.h), PAINT.nvidia, { layers: 12, alpha: 0.08 });
  const cols = 6;
  const rows = 4;
  const sw = 120;
  const sh = 96;
  const SM = (c: number, rr: number): Pt => [die.x + 30 + c * (sw + 14), die.y + 34 + rr * (sh + 16)];
  for (let c = 0; c < cols; c++)
    for (let rr = 0; rr < rows; rr++) {
      const [x, y] = SM(c, rr);
      k.rect(x, y, sw, sh, { width: 0.8, tone: 0.6 });
      k.paint(rectPts(x, y, sw, sh), PAINT.green, { layers: 6, alpha: 0.07 });
    }
  // Memory stacks either side.
  for (const x of [250, 1270]) {
    for (let i = 0; i < 2; i++) {
      k.rect(x, 210 + i * 200, 80, 160, { width: 1 });
      k.paint(rectPts(x, 210 + i * 200, 80, 160), PAINT.violet, { layers: 8, alpha: 0.08 });
    }
  }
  return {
    ink: k.ink,
    washes: k.washes,
    focus: { x: 220, y: 110, w: 1180, h: 620 },
    live(ctx, st) {
      write(ctx, st, 'GPU', 800, 128, 36, { at: -1.4, align: 'center', weight: 700 });
      write(ctx, st, 'memory', 290, 600, 28, { at: -1.2, align: 'center', colour: PAINT.violet });
      write(ctx, st, 'memory', 1310, 600, 28, { at: -1.2, align: 'center', colour: PAINT.violet });
      write(ctx, st, `each block: a streaming multiprocessor · its ${WARP} dots: one warp of threads, lit in step`, 800, 690, 30, { at: 0.5, align: 'center' });
      // The cores, 32 to a block as dots, lit a warp at a time in a wave across the chip.
      for (let c = 0; c < cols; c++)
        for (let rr = 0; rr < rows; rr++) {
          const [x, y] = SM(c, rr);
          const phase = st.alive * 1.6 - (c + rr) * 0.5;
          const on = st.alive < 0 ? 0 : Math.pow(Math.max(0, Math.sin(phase)), 6);
          for (let i = 0; i < WARP; i++) {
            const cx = x + 14 + (i % 8) * 13;
            const cy = y + 20 + Math.floor(i / 8) * 19;
            dot(ctx, cx, cy, 4, on > 0.2 ? '#f4d27a' : PAINT.green, 0.35 + 0.65 * Math.max(on, 0.25));
          }
          glow(ctx, x + sw / 2, y + sh / 2, 90, '240,210,120', 0.3 * on);
        }
      if (st.alive < 0) return;
      // Data streaming in from memory.
      for (let i = 0; i < 10; i++) {
        const u = (st.alive * 0.5 + i / 10) % 1;
        dot(ctx, 330 + u * 50, 250 + i * 32, 4, PAINT.violet, 0.7);
        dot(ctx, 1270 - u * 50, 250 + i * 32, 4, PAINT.violet, 0.7);
      }
    },
  };
}

function matmulScene(r: Rng): SceneArt {
  const k = new Kit(r);
  const mm = matmul();
  const cell = 110;
  const grids = { A: 250, B: 620, C: 1030 };
  const Y = 200;
  for (const x of Object.values(grids)) {
    for (let i = 0; i <= 2; i++) {
      k.line([x, Y + i * cell], [x + cell * 2, Y + i * cell], { width: 1 });
      k.line([x + i * cell, Y], [x + i * cell, Y + cell * 2], { width: 1 });
    }
  }
  k.paint(rectPts(grids.A, Y, cell * 2, cell * 2), PAINT.sky, { layers: 8, alpha: 0.08 });
  k.paint(rectPts(grids.B, Y, cell * 2, cell * 2), PAINT.orange, { layers: 8, alpha: 0.07 });
  k.paint(rectPts(grids.C, Y, cell * 2, cell * 2), PAINT.nvidia, { layers: 8, alpha: 0.07 });
  const put = (ctx: CanvasRenderingContext2D, st: LiveState, x0: number, M: number[][], at: number, show = () => true) =>
    M.forEach((row, i) => row.forEach((v, j) => show() && write(ctx, st, String(v), x0 + j * cell + cell / 2, Y + i * cell + cell / 2 + 16, 48, { at, align: 'center', weight: 700 })));
  return {
    ink: k.ink,
    washes: k.washes,
    focus: { x: 220, y: 130, w: 1160, h: 600 },
    live(ctx, st) {
      write(ctx, st, 'A', grids.A + cell, Y - 22, 34, { at: -1.4, align: 'center', colour: PAINT.grey });
      write(ctx, st, 'B', grids.B + cell, Y - 22, 34, { at: -1.4, align: 'center', colour: PAINT.grey });
      write(ctx, st, 'C = A × B', grids.C + cell, Y - 22, 34, { at: -1.4, align: 'center', colour: PAINT.grey });
      write(ctx, st, '×', 555, Y + cell + 18, 56, { at: -1.2, align: 'center' });
      write(ctx, st, '=', 945, Y + cell + 18, 56, { at: -1.2, align: 'center' });
      put(ctx, st, grids.A, mm.A, -1);
      put(ctx, st, grids.B, mm.B, -0.8);
      if (st.alive < 0) return;
      // One answer at a time, then all four at once, as a GPU would.
      const cycle = st.alive % 12;
      const each = Math.floor(cycle / 2.2);
      const together = cycle >= 8.8;
      for (let i = 0; i < 2; i++)
        for (let j = 0; j < 2; j++) {
          const idx = i * 2 + j;
          const active = together || idx === each;
          const done = together || idx <= each;
          if (active) {
            ctx.fillStyle = 'rgba(235,164,44,0.22)';
            ctx.fillRect(grids.A, Y + i * cell, cell * 2, cell);
            ctx.fillRect(grids.B + j * cell, Y, cell, cell * 2);
            ctx.fillStyle = 'rgba(118,168,58,0.3)';
            ctx.fillRect(grids.C + j * cell, Y + i * cell, cell, cell);
          }
          if (done) {
            ctx.save();
            ctx.font = `700 48px ${st.hand}`;
            ctx.textAlign = 'center';
            ctx.fillStyle = PAINT.ink;
            ctx.fillText(String(mm.C[i][j]), grids.C + j * cell + cell / 2, Y + i * cell + cell / 2 + 16);
            ctx.restore();
          }
        }
      if (!together) {
        const [i, j] = [Math.floor(each / 2), each % 2];
        ctx.save();
        ctx.font = `700 44px ${st.hand}`;
        ctx.textAlign = 'center';
        ctx.fillStyle = PAINT.ultramarine;
        ctx.fillText(`c${'₁₂'[i]}${'₁₂'[j]} = ${mm.working[i][j]}`, 800, 560);
        ctx.restore();
      } else {
        ctx.save();
        ctx.font = `700 40px ${st.hand}`;
        ctx.textAlign = 'center';
        ctx.fillStyle = PAINT.green;
        ctx.fillText('on a GPU: four threads, all four answers at once', 800, 560);
        ctx.restore();
      }
    },
  };
}

function neuronScene(r: Rng): SceneArt {
  const k = new Kit(r);
  const n = neuron();
  const ins: Pt[] = [[300, 220], [300, 380], [300, 540]];
  const N: Pt = [760, 380];
  ins.forEach(([x, y]) => {
    k.circle(x, y, 44, { width: 1.1 });
    k.paint(circlePts(x, y, 42, 24), PAINT.sky, { layers: 8, alpha: 0.1 });
    k.line([x + 46, y], [N[0] - 80, N[1] + (y - N[1]) * 0.25], { width: 1 });
  });
  k.circle(N[0], N[1], 80, { width: 1.4 });
  k.paint(circlePts(N[0], N[1], 78, 30), PAINT.orange, { layers: 10, alpha: 0.09 });
  k.arrow([N[0], 620], [N[0], 468], { width: 0.9 });
  k.arrow([N[0] + 82, N[1]], [980, N[1]], { width: 1.1 });
  // The sigmoid, drawn from the function itself.
  const plot = { x: 1000, y: 240, w: 300, h: 280 };
  k.line([plot.x, plot.y + plot.h], [plot.x + plot.w, plot.y + plot.h], { width: 0.8, tone: 0.5 });
  k.line([plot.x + plot.w / 2, plot.y], [plot.x + plot.w / 2, plot.y + plot.h], { width: 0.8, tone: 0.5 });
  const Z = (z: number) => plot.x + ((z + 6) / 12) * plot.w;
  const S = (v: number) => plot.y + plot.h - v * plot.h;
  const sig: Pt[] = Array.from({ length: 41 }, (_, i) => {
    const z = -6 + i * 0.3;
    return [Z(z), S(sigmoid(z))];
  });
  k.path(sig, { width: 1.3, overshoot: 0 });
  return {
    ink: k.ink,
    washes: k.washes,
    focus: { x: 220, y: 130, w: 1200, h: 600 },
    live(ctx, st) {
      ins.forEach(([x, y], i) => {
        write(ctx, st, String(n.x[i]), x, y + 12, 34, { at: -1.4, align: 'center', weight: 700 });
        write(ctx, st, `w${'₁₂₃'[i]} = ${String(n.w[i]).replace('-', '−')}`, (x + N[0]) / 2 - 20, (y + N[1]) / 2 - 12, 26, { at: -1.2, align: 'center', colour: PAINT.grey });
      });
      write(ctx, st, 'Σ', N[0], N[1] + 22, 64, { at: -1, align: 'center', weight: 700 });
      write(ctx, st, `bias b = ${String(n.b).replace('-', '−')}`, N[0], 660, 28, { at: -1, align: 'center', colour: PAINT.grey });
      write(ctx, st, 'sigmoid', plot.x + plot.w / 2, plot.y - 18, 28, { at: -0.8, align: 'center', colour: PAINT.grey });
      if (st.alive < 0) return;
      const u = (st.alive % 2) / 2;
      ins.forEach(([x, y]) => {
        const end: Pt = [N[0] - 80, N[1] + (y - N[1]) * 0.25];
        glow(ctx, x + 46 + (end[0] - x - 46) * u, y + (end[1] - y) * u, 18, '255,205,110', 0.8);
      });
      write(ctx, st, `z = ${n.z}`, N[0], N[1] - 100, 38, { at: 1, align: 'center', weight: 700, colour: PAINT.ultramarine });
      const p = smooth(2, 3, st.alive);
      if (p > 0) {
        const zx = Z(n.z);
        const zy = S(sigmoid(n.z));
        ctx.setLineDash([6, 6]);
        ctx.strokeStyle = 'rgba(29,29,33,0.5)';
        ctx.beginPath();
        ctx.moveTo(zx, plot.y + plot.h);
        ctx.lineTo(zx, plot.y + plot.h - (plot.y + plot.h - zy) * p);
        ctx.stroke();
        ctx.setLineDash([]);
        if (p >= 1) {
          dot(ctx, zx, zy, 9, PAINT.red);
          write(ctx, st, `output ${n.y}`, zx + 16, zy - 16, 34, { at: 3, weight: 700, colour: PAINT.red });
        }
      }
    },
  };
}

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
  return {
    ink: k.ink,
    washes: k.washes,
    focus: { x: 220, y: 110, w: 1180, h: 620 },
    live(ctx, st) {
      write(ctx, st, 'loss — how wrong', plot.x + 12, plot.y - 10, 30, { at: -1.4, colour: PAINT.grey });
      write(ctx, st, 'weight w', plot.x + plot.w, plot.y + plot.h + 44, 30, { at: -1.3, align: 'right', colour: PAINT.grey });
      write(ctx, st, `lowest at w = ${TARGET}`, X(TARGET), Y(0) + 44, 28, { at: -1, align: 'center', colour: PAINT.green });
      if (st.alive < 0) return;
      const per = 1.4;
      const cycle = st.alive % (per * (gd.steps.length + 1.5));
      const i = Math.min(gd.steps.length - 1, Math.floor(cycle / per));
      const f = smooth(0.1, 0.8, (cycle % per) / per);
      const a = gd.steps[i];
      const b = gd.steps[Math.min(gd.steps.length - 1, i + 1)];
      const w = i < gd.steps.length - 1 ? a.w + (b.w - a.w) * f : a.w;
      const x = X(w);
      const y = Y(loss(w)) - Math.sin(f * Math.PI) * 30 * (i < gd.steps.length - 1 ? 1 : 0) - 14;
      // The slope where the ball is: the tangent line.
      const s = 2 * (w - TARGET);
      ctx.strokeStyle = 'rgba(207,63,44,0.6)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(X(w - 0.8), Y(loss(w) - s * 0.8));
      ctx.lineTo(X(w + 0.8), Y(loss(w) + s * 0.8));
      ctx.stroke();
      dot(ctx, x, y, 14, PAINT.red);
      ctx.save();
      ctx.font = `700 36px ${st.hand}`;
      ctx.textAlign = 'center';
      ctx.fillStyle = PAINT.ultramarine;
      ctx.fillText(`step ${i}:  w = ${a.w},  loss = ${a.loss}`, 1000, 250);
      ctx.restore();
    },
  };
}

function languageScene(r: Rng): SceneArt {
  const k = new Kit(r);
  const probs = softmax();
  const att = attention();
  const TX = (i: number) => 230 + i * 150;
  const TY = 500;
  const tiles = [...CONTEXT, '?'];
  tiles.forEach((_, i) => {
    k.rect(TX(i), TY, 130, 70, { width: 1 });
    k.paint(rectPts(TX(i), TY, 130, 70), i === tiles.length - 1 ? PAINT.orange : PAINT.pale, { layers: 8, alpha: 0.12 });
  });
  const bars = { x: 1230, y: 200, w: 200 };
  CANDIDATES.forEach((_, i) => k.line([bars.x, bars.y + i * 90 + 60], [bars.x + bars.w, bars.y + i * 90 + 60], { width: 0.6, tone: 0.4 }));
  return {
    ink: k.ink,
    washes: k.washes,
    focus: { x: 210, y: 120, w: 1250, h: 520 },
    live(ctx, st) {
      tiles.forEach((w, i) => write(ctx, st, w, TX(i) + 65, TY + 46, 32, { at: -1.4 + i * 0.12, align: 'center', weight: 700 }));
      write(ctx, st, 'next word?', bars.x + bars.w / 2, bars.y - 30, 30, { at: -1, align: 'center', colour: PAINT.grey });
      if (st.alive < 0) return;
      const cycle = st.alive % 9;
      // Attention: arcs from the last word back to each, as thick as it attends.
      const from = TX(4) + 65;
      att.forEach((a, i) => {
        const p = smooth(0.2 + i * 0.15, 0.8 + i * 0.15, cycle);
        if (p <= 0) return;
        const to = TX(i) + 65;
        if (to === from) {
          // A word weighs itself too: a small loop above it.
          ctx.strokeStyle = `rgba(43,63,158,${(0.25 + a * 0.9).toFixed(3)})`;
          ctx.lineWidth = 2 + a * 22;
          ctx.beginPath();
          ctx.ellipse(from, TY - 46, 22, 36, 0, Math.PI / 2, Math.PI / 2 + Math.PI * 2 * p);
          ctx.stroke();
          return;
        }
        ctx.strokeStyle = `rgba(43,63,158,${(0.25 + a * 0.9).toFixed(3)})`;
        ctx.lineWidth = 2 + a * 22;
        ctx.beginPath();
        const h = 80 + Math.abs(from - to) * 0.35;
        const n = 30;
        for (let s = 0; s <= n * p; s++) {
          const u = s / n;
          const x = from + (to - from) * u;
          const y = TY - 6 - Math.sin(u * Math.PI) * h;
          if (s === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      });
      probs.forEach((p, i) => {
        const g = smooth(2.2 + i * 0.2, 3.2 + i * 0.2, cycle);
        const y = bars.y + i * 90;
        ctx.fillStyle = i === 0 ? 'rgba(224,138,43,0.7)' : 'rgba(143,179,217,0.7)';
        ctx.fillRect(bars.x, y + 22, bars.w * p.p * g, 34);
        write(ctx, st, `${p.word}  ${p.percent}%`, bars.x, y + 12, 30, { at: 2.2, weight: 700 });
      });
      const put = smooth(4.5, 5.2, cycle);
      if (put > 0) {
        const x = bars.x + (TX(5) + 65 - bars.x) * put;
        const y = bars.y + 50 + (TY + 46 - bars.y - 50) * put;
        ctx.save();
        ctx.font = `700 34px ${st.hand}`;
        ctx.textAlign = 'center';
        ctx.fillStyle = PAINT.red;
        ctx.fillText(probs[0].word, x, y);
        ctx.restore();
      }
    },
  };
}

function agentScene(r: Rng): SceneArt {
  const k = new Kit(r);
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
  const loop: Pt[] = [
    ...curve([nodes.model, [1010, 250], nodes.tools], 10),
    ...curve([nodes.tools, [1010, 580], nodes.observe], 10).slice(1),
    ...curve([nodes.observe, [590, 420], nodes.model], 10).slice(1),
  ];
  // The loop is drawn only between the circles, never across them.
  const outside = (p: Pt) => Object.values(nodes).every(([x, y]) => Math.hypot(p[0] - x, p[1] - y) > 76);
  for (const leg of [curve([nodes.model, [1010, 250], nodes.tools], 40), curve([nodes.tools, [1010, 580], nodes.observe], 40), curve([nodes.observe, [590, 420], nodes.model], 40)]) {
    const kept = leg.filter(outside);
    if (kept.length > 1) k.arrow(kept[kept.length - 2], kept[kept.length - 1], { width: 1, overshoot: 0 });
    k.path(kept, { width: 1, overshoot: 0 });
  }
  k.arrow([370, 360], [735, 220], { width: 1 });
  k.arrow([870, 190], [1255, 190], { width: 1, tone: 0.5 });
  return {
    ink: k.ink,
    washes: k.washes,
    focus: { x: 200, y: 100, w: 1220, h: 600 },
    live(ctx, st) {
      const label = (id: keyof typeof nodes, s: string) => write(ctx, st, s, nodes[id][0], nodes[id][1] + 10, 30, { at: -1.3, align: 'center', weight: 700 });
      label('goal', 'goal');
      label('model', 'model');
      label('tools', 'tools');
      label('observe', 'observe');
      label('answer', 'answer');
      write(ctx, st, 'search · code · data', nodes.tools[0], nodes.tools[1] + 110, 26, { at: -1, align: 'center', colour: PAINT.grey });
      write(ctx, st, 'plan', 930, 230, 26, { at: -0.8, colour: PAINT.grey });
      write(ctx, st, 'act', 1060, 560, 26, { at: -0.8, colour: PAINT.grey });
      write(ctx, st, 'try again', 540, 470, 26, { at: -0.8, colour: PAINT.grey });
      if (st.alive < 0) return;
      const cycle = st.alive % 8;
      if (cycle < 6) {
        const [x, y] = along(loop, (cycle / 3) % 1);
        glow(ctx, x, y, 34, '255,205,110', 0.95);
        const near = (Object.keys(nodes) as (keyof typeof nodes)[]).find((id) => Math.hypot(nodes[id][0] - x, nodes[id][1] - y) < 80);
        if (near) glow(ctx, nodes[near][0], nodes[near][1], 110, '255,205,110', 0.35);
      } else {
        const u = smooth(6, 7.5, cycle);
        glow(ctx, 870 + (1255 - 870) * u, 190, 34, '255,205,110', 0.95);
        glow(ctx, nodes.answer[0], nodes.answer[1], 120, '255,205,110', 0.5 * u);
      }
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
