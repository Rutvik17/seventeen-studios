/**
 * THE FOUNDER FILM'S DIRECTOR.
 *
 * The script is `content/founder.ts`; the drawings are `scenes.ts` and
 * `portrait.ts`. This runs them, one scene after another, the way the
 * landing's film makes the campus:
 *
 * 1. **Making.** The scene is sketched in pencil — the pencil drawn where it
 *    is working — and then painted, the brush moving from wash to wash. Both
 *    go into two layers the size of the world, which only ever gain paint;
 *    the frame is those two layers drawn through the camera.
 * 2. **Alive.** The finished painting holds for the scene's `hold`, and its
 *    `live` part draws over it every frame: current through a switch, warps
 *    across a GPU, the loop of an agent.
 * 3. **Wash-out.** The last frame is lifted off the page through a mask of
 *    growing blots, as a wet sheet is sponged, while the next scene's pencil
 *    starts on the paper underneath.
 *
 * The camera fits each scene's `focus` into the part of the screen the
 * captions leave free, and pushes in a little while the scene lasts.
 *
 * Reduced motion: no pencil, no brush, no push, no wash-out. Each scene is its
 * finished painting, still, drawn once when it is chosen.
 */

import { scenes, type FounderPhoto, type SceneId } from '@/content/founder';
import { clamp, rng, smooth } from '@/lib/film/random';
import { drawBrush, drawPencil } from '@/lib/film/tools';
import { Progressive } from '@/lib/film/progressive';
import { buildScene, glow, type LiveState, type SceneArt } from './scenes';
import { framed, portrait as paintPortrait, regionFor, type Portrait } from './portrait';

const WORLD = { w: 1600, h: 1000 };
/** Seconds to sketch and paint a scene; the portrait takes longer, as a portrait does. */
const MAKE = 7.5;
const MAKE_PORTRAIT = 17;
const WASH_OUT = 1.8;
/** The next scene's pencil waits this long into the wash-out. */
const OVERLAP = 0.7;

export interface FounderHooks {
  onScene(index: number): void;
  onProgress?(fraction: number): void;
  /** Called once the first frame is painted — the loader can go. */
  onReady?(): void;
}

export interface FounderFilm {
  begin(): void;
  goTo(index: number): void;
  setPlaying(on: boolean): void;
  setVisible(on: boolean): void;
  resize(): void;
  destroy(): void;
}

interface Running {
  index: number;
  art: SceneArt;
  make: number;
  ink: HTMLCanvasElement;
  paint: HTMLCanvasElement;
  prog: Progressive;
  t: number;
}

export function createFounderFilm(
  canvas: HTMLCanvasElement,
  opts: { image: HTMLImageElement; photo: FounderPhoto; reduced: boolean; hand: string; hooks: FounderHooks },
): FounderFilm {
  const { reduced, hand, hooks } = opts;
  const ctx = canvas.getContext('2d')!;
  const outgoing = document.createElement('canvas');
  const octx = outgoing.getContext('2d')!;
  // What moves is drawn on its own sheet first, so it can come in as one: it
  // fades up while the paint goes down, never pops on over a blank page.
  const moving = document.createElement('canvas');
  const mctx = moving.getContext('2d')!;

  // Where the photograph is painted, in world units.
  const frame0 = framed(opts.image, opts.photo);
  const PORTRAIT = regionFor(frame0.photo.aspect);
  const photo: Portrait = paintPortrait(frame0.image, frame0.photo, PORTRAIT);
  const portraitArt = (withMotes: boolean): SceneArt => ({
    ink: photo.ink,
    washes: photo.washes,
    focus: PORTRAIT,
    // Line and wash: the pencil stays, a little softened by the paint over it.
    inkAfter: 0.7,
    live(c, st) {
      // The lamps on the water in the photograph flicker as flames do.
      const on = smooth(-1, 1.5, st.alive);
      if (on > 0) {
        c.globalCompositeOperation = 'screen';
        photo.lights.forEach((l, i) => {
          const f = 0.55 + 0.45 * Math.sin(st.t * (2.1 + (i % 5) * 0.37) + i * 1.7) * Math.sin(st.t * (0.9 + (i % 3) * 0.21) + i);
          glow(c, l.x, l.y, l.r * 4, l.colour, 0.35 * f * on);
        });
        c.globalCompositeOperation = 'source-over';
      }
      if (!withMotes || st.alive < 0) return;
      // Everything the film has told rising off him as 0s and 1s.
      c.save();
      c.font = `600 26px ${st.hand}`;
      c.textAlign = 'center';
      const r = rng(17);
      for (let i = 0; i < 70; i++) {
        const x = PORTRAIT.x - 180 + r() * (PORTRAIT.w + 360);
        const speed = 18 + r() * 30;
        const life = (st.alive * speed + r() * 900) % 900;
        const y = PORTRAIT.y + PORTRAIT.h - life;
        const a = Math.sin((life / 900) * Math.PI) * clamp(st.alive / 2);
        c.globalAlpha = a * 0.55;
        c.fillStyle = i % 3 === 0 ? '#2b3f9e' : i % 3 === 1 ? '#76a83a' : '#1d1d21';
        c.fillText(r() > 0.5 ? '1' : '0', x + Math.sin(st.alive * 0.6 + i) * 10, y);
      }
      c.restore();
    },
  });

  let cw = 1;
  let ch = 1;
  let dpr = 1;
  /** Backing pixels per world unit in the scene layers. */
  let bake = 1;
  let run: Running | null = null;
  let washT = -1;
  let blots: { x: number; y: number; r: number; at: number }[] = [];
  let playing = true;
  let visible = true;
  let begun = false;
  let ended = false;
  let raf = 0;
  let last = 0;
  let filmT = 0;

  /* ---------------- scenes ---------------- */

  function art(index: number): SceneArt {
    const id: SceneId = scenes[index].id;
    if (id === 'portrait') return portraitArt(false);
    if (id === 'return') return portraitArt(true);
    return buildScene(id, 1702 + index * 31)!;
  }

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

  function start(index: number, a = art(index)) {
    const ink = layer();
    const paint = layer();
    const prog = new Progressive(a, ink.getContext('2d')!, paint.getContext('2d')!, { inkEnd: 0.5, paintStart: 0.42 });
    run = { index, art: a, make: scenes[index].id === 'portrait' || scenes[index].id === 'return' ? MAKE_PORTRAIT : MAKE, ink, paint, prog, t: 0 };
    if (reduced) {
      prog.set(1);
      // A still is taken well into the story, where it has the most to show.
      run.t = run.make + scenes[index].hold * 0.7;
    }
    ended = false;
    hooks.onScene(index);
  }

  /** Where the making has got, 0–1, for a scene `t` seconds in. The hand starts carefully and gathers speed. */
  const made = (t: number, make: number) => {
    const p = clamp(t / make);
    return 0.3 * p * p + 0.7 * p;
  };

  /* ---------------- size ---------------- */

  const narrow = () => cw / ch < 0.95;

  /** The part of the screen a scene is fitted into, in backing pixels: what the captions leave. */
  function frame(index: number) {
    const face = scenes[index].id === 'portrait' || scenes[index].id === 'return';
    if (narrow()) return face ? { x: cw * 0.06, y: ch * 0.1, w: cw * 0.88, h: ch * 0.55 } : { x: cw * 0.03, y: ch * 0.1, w: cw * 0.94, h: ch * 0.46 };
    return face ? { x: cw * 0.42, y: ch * 0.11, w: cw * 0.54, h: ch * 0.74 } : { x: cw * 0.1, y: ch * 0.075, w: cw * 0.8, h: ch * 0.56 };
  }

  /** The camera for a scene: scale and offset from world to backing pixels. */
  function camera(r: Running) {
    const f = frame(r.index);
    const b = r.art.focus;
    const push = reduced ? 1 : 1 + 0.035 * smooth(0, r.make + scenes[r.index].hold, r.t);
    const S = Math.min(f.w / b.w, f.h / b.h) * push;
    const cx = b.x + b.w / 2;
    const cy = b.y + b.h / 2;
    return { S, OX: f.x + f.w / 2 - cx * S, OY: f.y + f.h / 2 - cy * S };
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
    outgoing.width = cw;
    outgoing.height = ch;
    moving.width = cw;
    moving.height = ch;
    washT = -1;

    // The layers are baked a little sharper than the largest scene will be shown, and no sharper.
    let want = 0;
    for (let i = 0; i < scenes.length; i++) {
      const f = frame(i);
      const focus = i === 0 || i === scenes.length - 1 ? PORTRAIT : { w: 1200, h: 690 };
      want = Math.max(want, Math.min(f.w / focus.w, f.h / focus.h) * 1.05);
    }
    want = Math.min(1.8, Math.max(0.4, want));
    if (Math.abs(want - bake) / bake > 0.2 || !run) {
      bake = want;
      if (run) {
        // A new size mid-scene: the scene is remade, whole, at once, as far as it had got.
        const { index, art: a, t } = run;
        start(index, a);
        run!.t = t;
        run!.prog.set(reduced ? 1 : made(t, run!.make));
      }
    }
  }

  /* ---------------- the frame ---------------- */

  function draw(target: CanvasRenderingContext2D, r: Running) {
    const { S, OX, OY } = camera(r);
    target.setTransform(1, 0, 0, 1, 0, 0);
    target.clearRect(0, 0, cw, ch);
    const k = S / bake;
    target.imageSmoothingQuality = 'high';
    target.drawImage(r.paint, OX, OY, r.paint.width * k, r.paint.height * k);
    const paintP = smooth(0.42, 1, r.prog.progress);
    target.globalAlpha = 0.92 + ((r.art.inkAfter ?? 0.92) - 0.92) * paintP;
    target.drawImage(r.ink, OX, OY, r.ink.width * k, r.ink.height * k);
    target.globalAlpha = 1;
    const st: LiveState = { t: filmT, made: r.prog.progress, alive: r.t - r.make, hand };
    const shown = reduced ? 1 : smooth(0.55, 0.97, r.prog.progress);
    if (r.art.live && shown > 0) {
      mctx.setTransform(1, 0, 0, 1, 0, 0);
      mctx.clearRect(0, 0, cw, ch);
      mctx.setTransform(S, 0, 0, S, OX, OY);
      mctx.lineCap = 'round';
      mctx.lineJoin = 'round';
      r.art.live(mctx, st);
      target.globalAlpha = shown;
      target.drawImage(moving, 0, 0);
      target.globalAlpha = 1;
    }
    target.setTransform(S, 0, 0, S, OX, OY);
    if (!reduced && r.prog.progress < 1) {
      if (r.prog.pencilAt && r.prog.progress < 0.5) drawPencil(target, r.prog.pencilAt[0], r.prog.pencilAt[1]);
      else if (r.prog.brushAt) drawBrush(target, r.prog.brushAt[0], r.prog.brushAt[1], filmT);
    }
    target.setTransform(1, 0, 0, 1, 0, 0);
  }

  /** Lift the frame now on screen off the page, and start the next scene underneath. */
  function washOut(next: number) {
    octx.setTransform(1, 0, 0, 1, 0, 0);
    octx.clearRect(0, 0, cw, ch);
    octx.drawImage(canvas, 0, 0);
    const r = rng(next * 97 + 5);
    const size = Math.hypot(cw, ch);
    blots = Array.from({ length: 26 }, () => ({ x: r() * cw, y: r() * ch, r: size * (0.12 + r() * 0.16), at: r() * 0.45 }));
    washT = 0;
    start(next);
    run!.t = -OVERLAP;
  }

  function wash(dt: number) {
    if (washT < 0) return;
    washT += dt;
    const p = washT / WASH_OUT;
    if (p >= 1) {
      washT = -1;
      return;
    }
    // The sponge: blots of the old painting lifted a little more each frame, softest at their rims.
    octx.globalCompositeOperation = 'destination-out';
    for (const b of blots) {
      const q = smooth(b.at, b.at + 0.55, p);
      if (q <= 0) continue;
      const rad = b.r * q;
      const g = octx.createRadialGradient(b.x, b.y, rad * 0.35, b.x, b.y, rad);
      g.addColorStop(0, 'rgba(0,0,0,0.35)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      octx.fillStyle = g;
      octx.fillRect(b.x - rad, b.y - rad, rad * 2, rad * 2);
    }
    octx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1 - smooth(0.6, 1, p);
    ctx.drawImage(outgoing, 0, 0);
    ctx.globalAlpha = 1;
  }

  function step(dt: number) {
    if (!run) return;
    filmT += dt;
    run.t += dt;
    if (run.t > 0) run.prog.set(made(run.t, run.make));
    const total = run.make + scenes[run.index].hold;
    hooks.onProgress?.(clamp(run.t / total));
    if (run.t >= total && washT < 0 && !ended) {
      if (run.index < scenes.length - 1) washOut(run.index + 1);
      else ended = true;
    }
  }

  function tick(now: number) {
    raf = 0;
    const dt = last ? Math.min(0.05, (now - last) / 1000) : 0;
    last = now;
    if (playing) step(dt);
    if (run) {
      draw(ctx, run);
      if (playing) wash(dt);
      else if (washT >= 0) wash(0);
    }
    schedule();
  }

  function schedule() {
    if (!raf && begun && visible && !reduced) raf = requestAnimationFrame(tick);
  }

  function still() {
    if (run) draw(ctx, run);
  }

  /* ---------------- start ---------------- */

  measure();
  start(0);
  if (reduced) still();
  hooks.onReady?.();

  return {
    begin() {
      if (begun) return;
      begun = true;
      last = 0;
      if (reduced) still();
      schedule();
    },
    goTo(index: number) {
      if (!run || index === run.index || index < 0 || index >= scenes.length) return;
      if (reduced) {
        start(index);
        still();
        return;
      }
      washOut(index);
      run!.t = -OVERLAP * 0.5;
    },
    setPlaying(on) {
      playing = on;
      last = 0;
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
      if (reduced || !begun) still();
    },
    destroy() {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      begun = false;
    },
  };
}
