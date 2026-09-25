/**
 * THE FOUNDER PAGE'S PAINTING.
 *
 * Rutvik, sketched from a photograph of him and painted, the way the
 * landing's film makes the campus. The painting is `portrait.ts`; this runs it:
 *
 * 1. **Making.** The pencil draws the portrait — the pencil itself drawn where
 *    it is working — and then the brush paints it, moving from wash to wash.
 *    Both go into two layers the size of the world, which only ever gain
 *    paint; the frame is those two layers drawn through the camera.
 * 2. **Alive.** Once finished it stays on the page, and what moves in it is
 *    drawn over it every frame: lights in the photograph flicker as flames do,
 *    and 0s and 1s rise off the page.
 *
 * The camera fits the portrait into the part of the screen the words beside
 * it leave free, and pushes in a little while it is made.
 *
 * Reduced motion: no pencil, no brush, no push. The finished painting, still,
 * drawn once, as it looks a while after it is made.
 */

import type { FounderPhoto } from '@/content/founder';
import { clamp, rng, smooth } from '@/lib/film/random';
import { drawBrush, drawPencil } from '@/lib/film/tools';
import { Progressive } from '@/lib/film/progressive';
import { framed, portrait as paintPortrait, regionFor } from './portrait';

const WORLD = { w: 1600, h: 1000 };
/** Seconds to sketch and paint the portrait. */
const MAKE = 17;

export interface FounderHooks {
  /** Called once the first frame is painted — the loader can go. */
  onReady?(): void;
}

export interface FounderFilm {
  begin(): void;
  setVisible(on: boolean): void;
  resize(): void;
  destroy(): void;
}

/** A radial glow, for lights. */
function glow(ctx: CanvasRenderingContext2D, x: number, y: number, rad: number, rgb: string, a: number) {
  if (a <= 0.01) return;
  const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
  g.addColorStop(0, `rgba(${rgb},${a.toFixed(3)})`);
  g.addColorStop(1, `rgba(${rgb},0)`);
  ctx.fillStyle = g;
  ctx.fillRect(x - rad, y - rad, rad * 2, rad * 2);
}

export function createFounderFilm(
  canvas: HTMLCanvasElement,
  opts: { image: HTMLImageElement; photo: FounderPhoto; reduced: boolean; hand: string; hooks: FounderHooks },
): FounderFilm {
  const { reduced, hand, hooks } = opts;
  const ctx = canvas.getContext('2d')!;
  // What moves is drawn on its own sheet first, so it can come in as one: it
  // fades up while the paint goes down, never pops on over a blank page.
  const moving = document.createElement('canvas');
  const mctx = moving.getContext('2d')!;

  // Where the photograph is painted, in world units.
  const frame0 = framed(opts.image, opts.photo);
  const FOCUS = regionFor(frame0.photo.aspect);
  const drawing = paintPortrait(frame0.image, frame0.photo, FOCUS);

  /** What keeps moving once the portrait is painted. `alive`: seconds since it was finished. */
  function live(c: CanvasRenderingContext2D, t: number, alive: number) {
    const on = smooth(-1, 1.5, alive);
    if (on > 0) {
      // The lamps and lights in the photograph flicker as flames do.
      c.globalCompositeOperation = 'screen';
      drawing.lights.forEach((l, i) => {
        const f = 0.55 + 0.45 * Math.sin(t * (2.1 + (i % 5) * 0.37) + i * 1.7) * Math.sin(t * (0.9 + (i % 3) * 0.21) + i);
        glow(c, l.x, l.y, l.r * 4, l.colour, 0.35 * f * on);
      });
      c.globalCompositeOperation = 'source-over';
    }
    if (alive < 0) return;
    // 0s and 1s — what everything he builds is made of — rising off the page.
    c.save();
    c.font = `600 26px ${hand}`;
    c.textAlign = 'center';
    const r = rng(17);
    for (let i = 0; i < 70; i++) {
      const x = FOCUS.x - 180 + r() * (FOCUS.w + 360);
      const speed = 18 + r() * 30;
      const life = (alive * speed + r() * 900) % 900;
      const y = FOCUS.y + FOCUS.h - life;
      const a = Math.sin((life / 900) * Math.PI) * clamp(alive / 2);
      c.globalAlpha = a * 0.55;
      c.fillStyle = i % 3 === 0 ? '#2b3f9e' : i % 3 === 1 ? '#76a83a' : '#1d1d21';
      c.fillText(r() > 0.5 ? '1' : '0', x + Math.sin(alive * 0.6 + i) * 10, y);
    }
    c.restore();
  }

  let cw = 1;
  let ch = 1;
  let dpr = 1;
  /** Backing pixels per world unit in the two layers. */
  let bake = 1;
  let ink: HTMLCanvasElement | null = null;
  let paint: HTMLCanvasElement | null = null;
  let prog: Progressive | null = null;
  let visible = true;
  let begun = false;
  let raf = 0;
  let last = 0;
  /** Seconds since the portrait began. A still is taken well after it is finished, where it has the most to show. */
  let t = reduced ? MAKE + 10 : 0;

  function layer(): HTMLCanvasElement {
    const c = document.createElement('canvas');
    c.width = Math.ceil(WORLD.w * bake);
    c.height = Math.ceil(WORLD.h * bake);
    const x = c.getContext('2d')!;
    x.setTransform(bake, 0, 0, bake, 0, 0);
    x.lineCap = 'round';
    x.lineJoin = 'round';
    return c;
  }

  /** Where the making has got, 0–1, `t` seconds in. The hand starts carefully and gathers speed. */
  const made = (s: number) => {
    const p = clamp(s / MAKE);
    return 0.3 * p * p + 0.7 * p;
  };

  /** (Re)start the layers, and bring them to where the making has got. */
  function setup() {
    ink = layer();
    paint = layer();
    prog = new Progressive(drawing, ink.getContext('2d')!, paint.getContext('2d')!, { inkEnd: 0.5, paintStart: 0.42 });
    prog.set(reduced ? 1 : made(t));
  }

  /* ---------------- size ---------------- */

  /** The part of the screen the portrait is fitted into, in backing pixels: what the words leave. */
  function frame() {
    if (cw / ch < 0.95) return { x: cw * 0.06, y: ch * 0.1, w: cw * 0.88, h: ch * 0.55 };
    return { x: cw * 0.42, y: ch * 0.11, w: cw * 0.54, h: ch * 0.74 };
  }

  function camera() {
    const f = frame();
    const push = reduced ? 1 : 1 + 0.035 * smooth(0, MAKE + 14, t);
    const S = Math.min(f.w / FOCUS.w, f.h / FOCUS.h) * push;
    return { S, OX: f.x + f.w / 2 - (FOCUS.x + FOCUS.w / 2) * S, OY: f.y + f.h / 2 - (FOCUS.y + FOCUS.h / 2) * S };
  }

  function measure() {
    const rect = canvas.getBoundingClientRect();
    const d = Math.min(2, window.devicePixelRatio || 1);
    const cap = Math.min(1, Math.sqrt(4.2e6 / Math.max(1, rect.width * rect.height * d * d)));
    dpr = d * cap;
    cw = Math.max(1, Math.round(rect.width * dpr));
    ch = Math.max(1, Math.round(rect.height * dpr));
    canvas.width = cw;
    canvas.height = ch;
    moving.width = cw;
    moving.height = ch;
    // The layers are baked a little sharper than the portrait will be shown, and no sharper.
    const f = frame();
    const want = Math.min(1.8, Math.max(0.4, Math.min(f.w / FOCUS.w, f.h / FOCUS.h) * 1.05));
    if (!prog || Math.abs(want - bake) / bake > 0.2) {
      bake = want;
      setup();
    }
  }

  /* ---------------- the frame ---------------- */

  function draw() {
    if (!ink || !paint || !prog) return;
    const { S, OX, OY } = camera();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, cw, ch);
    const k = S / bake;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(paint, OX, OY, paint.width * k, paint.height * k);
    // Line and wash: the pencil stays, a little softened by the paint over it.
    ctx.globalAlpha = 0.92 + (0.7 - 0.92) * smooth(0.42, 1, prog.progress);
    ctx.drawImage(ink, OX, OY, ink.width * k, ink.height * k);
    ctx.globalAlpha = 1;
    const shown = reduced ? 1 : smooth(0.55, 0.97, prog.progress);
    if (shown > 0) {
      mctx.setTransform(1, 0, 0, 1, 0, 0);
      mctx.clearRect(0, 0, cw, ch);
      mctx.setTransform(S, 0, 0, S, OX, OY);
      live(mctx, t, t - MAKE);
      ctx.globalAlpha = shown;
      ctx.drawImage(moving, 0, 0);
      ctx.globalAlpha = 1;
    }
    ctx.setTransform(S, 0, 0, S, OX, OY);
    if (!reduced && prog.progress < 1) {
      if (prog.pencilAt && prog.progress < 0.5) drawPencil(ctx, prog.pencilAt[0], prog.pencilAt[1]);
      else if (prog.brushAt) drawBrush(ctx, prog.brushAt[0], prog.brushAt[1], t);
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  function tick(now: number) {
    raf = 0;
    const dt = last ? Math.min(0.05, (now - last) / 1000) : 0;
    last = now;
    t += dt;
    prog?.set(made(t));
    draw();
    schedule();
  }

  function schedule() {
    if (!raf && begun && visible && !reduced) raf = requestAnimationFrame(tick);
  }

  /* ---------------- start ---------------- */

  measure();
  if (reduced) draw();
  hooks.onReady?.();

  return {
    begin() {
      if (begun) return;
      begun = true;
      last = 0;
      if (reduced) draw();
      schedule();
    },
    setVisible(on) {
      visible = on;
      last = 0;
      if (on) schedule();
      else if (raf) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
    },
    resize() {
      measure();
      draw();
    },
    destroy() {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      begun = false;
    },
  };
}
