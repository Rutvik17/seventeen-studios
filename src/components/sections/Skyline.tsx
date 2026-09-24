'use client';

/**
 * The cities beside the cover's title, drawn in coloured pencil one after
 * another on the same line of ground "Studios" stands on.
 *
 * Each city's sky is brushed in first, in pale acrylic; then its landmarks'
 * outlines, the streets round them, then windows, shading and water; its name
 * is written under the ground. Once it has stood a moment it is rubbed out —
 * faded, as graphite goes under an eraser — while the next is already being
 * painted and sketched in, and the ground line never moves, so the page is
 * never empty and nothing jumps.
 *
 * Only where the cover has room: `box` is the space the title leaves, and is
 * null on a narrow screen.
 *
 * REDUCED MOTION
 *
 * Each city appears already drawn, and they change by fading, with longer to
 * look at each.
 */

import { useEffect, useRef } from 'react';
import { prefersReducedMotion } from '@/lib/gsap';
import { useUi } from '@/lib/store';
import { skylines } from '@/content/studio';
import { grain, prepare, stroke, type Prepared } from '@/lib/sketchbook/pencil';
import { paintStroke, shade } from '@/lib/sketchbook/brush';
import { rng } from '@/lib/sketchbook/geometry';
import { drawCity, PENCILS, TALLEST, type Mark } from '@/lib/sketch/skylines';

/** Where the drawing goes, in the title's box, in CSS pixels. */
export type SkylineBox = { left: number; width: number; height: number; ground: number };

/** Seconds: the ground line; one city's drawing; how long it stands; the handover. */
const TIMING = { ground: 1.1, draw: 6.5, hold: 3.2, fade: 1.8 };
const STILL = { ground: 0, draw: 0, hold: 7, fade: 1.2 };
/** Seconds for a city's sky to be brushed in. */
const SKY_IN = 0.9;
/** Seconds for the old city's name to go, before the new one is written. */
const NAME_OUT = 0.5;
/** How fast the pencil moves, in CSS pixels a second. */
const SPEED = 520;

type Laid = { lines: Prepared[]; lengths: number[]; total: number; mark: Mark; start: number; end: number };
type City = { index: number; laid: Laid[]; done: HTMLCanvasElement; sky: HTMLCanvasElement; baked: Uint8Array; name: string; ink: string[] };

/** Stroke a bundle of lines up to `u` of their joint length. */
function strokeAll(ctx: CanvasRenderingContext2D, l: Laid, u: number, paint: CanvasPattern | string) {
  let left = u * l.total;
  for (let i = 0; i < l.lines.length && left > 0; i += 1) {
    stroke(ctx, l.lines[i], Math.min(1, left / (l.lengths[i] || 1)), paint, l.mark.alpha);
    left -= l.lengths[i];
  }
}

/** `delay`: seconds after the page is uncovered before the first line goes down. */
export function Skyline({ box, delay }: { box: SkylineBox | null; delay: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const entered = useUi((s) => s.entered);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || !box || !entered) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const reduced = prefersReducedMotion();
    const T = reduced ? STILL : TIMING;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const W = Math.round(box.width * dpr);
    const H = Math.round(box.height * dpr);
    canvas.width = W;
    canvas.height = H;
    // Drawing units to device pixels: the ground on `box.ground`, the tallest
    // city just fitting above it. Line widths are given in units too, so a
    // weight of 1.5 is 1.5 CSS pixels whatever the scale.
    const px = (box.ground - 10) / TALLEST;
    const units = box.width / px;
    const toUnits = (c: CanvasRenderingContext2D) => c.setTransform(dpr * px, 0, 0, dpr * px, 0, box.ground * dpr);

    const tokens = getComputedStyle(document.documentElement);
    const token = (name: string) => tokens.getPropertyValue(name).trim();
    const hand = token('--font-hand') || 'cursive';
    const graphite = token('--fg');
    const papers = new Map<string, CanvasPattern>();
    // A coloured pencil: its colour in grain, so the paper shows through the mark.
    const pencil = (colour: string) => {
      let p = papers.get(colour);
      if (!p) {
        p = ctx.createPattern(grain(colour, 5, 0.9), 'repeat')!;
        papers.set(colour, p);
      }
      return p;
    };

    const sheet = () => {
      const c = document.createElement('canvas');
      c.width = W;
      c.height = H;
      return c;
    };

    // The ground: one line, drawn once, kept.
    const groundLine = prepare(
      Array.from({ length: 60 }, (_, i) => ({ x: -4 + ((units + 8) * i) / 59, y: 0 })),
      { seed: 3, width: 1.5 / px, jitter: 0.7 / px, overshoot: 0, passes: 2 },
    );
    const ground = sheet();

    // A city's marks, laid out in time: each takes as long as its lines are
    // long, the next starting before it has quite finished, as a hand does.
    const plans = new Map<number, Laid[]>();
    const plan = (k: number): Laid[] => {
      const cached = plans.get(k);
      if (cached) return cached;
      const id = skylines[k].id;
      let t = 0;
      const laid = drawCity(id, units).map((mark, i) => {
        const lines = mark.paths.map((pts, j) =>
          prepare(pts, {
            seed: k * 1000 + i * 7 + j,
            width: mark.weight / px,
            jitter: (mark.phase === 2 ? 0.4 : 0.8) / px,
            overshoot: (mark.phase === 2 ? 1 : 3) / px,
            passes: mark.phase === 2 ? 1 : 2,
          }),
        );
        const lengths = lines.map((l) => l.length);
        const total = lengths.reduce((a, b) => a + b, 0);
        const d = Math.min(0.8, Math.max(0.035, (total * px) / (SPEED * (mark.phase === 2 ? 1.8 : 1))));
        const start = t;
        t += d * 0.6;
        return { lines, lengths, total, mark, start, end: start + d };
      });
      const last = Math.max(...laid.map((l) => l.end), 0.001);
      const squeeze = T.draw ? Math.min(1, T.draw / last) : 0;
      for (const l of laid) {
        l.start *= squeeze;
        l.end *= squeeze;
      }
      plans.set(k, laid);
      return laid;
    };

    /**
     * The city's sky, painted before it is drawn: loose strokes of acrylic
     * across the room above the ground, pale — its shading pencil's colour
     * high up, warming to its landmarks' colour down by the horizon.
     */
    const paintSky = (ink: string[], seed: number) => {
      const c = sheet();
      const g = c.getContext('2d')!;
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      const rand = rng(seed * 13 + 5);
      const top = box.ground * 0.06;
      const bottom = box.ground + 6;
      const rows = 8;
      const band = ((bottom - top) / rows) * 1.6;
      for (let r = 0; r < rows; r += 1) {
        const y = top + ((r + 0.5) * (bottom - top)) / rows;
        // Ragged at both ends, and narrower towards the top, as a sky gets
        // brushed in loosely round what will stand in it.
        const inset = (1 - r / rows) * 0.18 + rand() * 0.1;
        const x0 = box.width * inset * rand();
        const x1 = box.width * (1 - inset * rand());
        const pts = Array.from({ length: 9 }, (_, i) => ({ x: x0 + ((x1 - x0) * i) / 8, y: y + Math.sin((i / 8) * Math.PI * (1 + rand())) * band * 0.06 }));
        const colour = r < rows - 3 ? shade(ink[2], 0.8 + r * 0.015) : shade(ink[0], 0.82);
        paintStroke(g, r % 2 ? pts.reverse() : pts, { width: band, colour, seed: seed * 50 + r, alpha: 0.62, streak: 0.05, dry: 0.4, edge: false });
      }
      return c;
    };

    const open = (index: number): City => {
      const k = index % skylines.length;
      const laid = plan(k);
      const ink = PENCILS[skylines[k].id].map((n) => token(`--paint-${n}`));
      return { index, laid, done: sheet(), sky: paintSky(ink, k), baked: new Uint8Array(laid.length), name: skylines[k].name, ink };
    };

    /** Put down, for good, every mark of `city` finished by `tau`. */
    const bake = (city: City, tau: number) => {
      const d = city.done.getContext('2d')!;
      toUnits(d);
      city.laid.forEach((l, i) => {
        if (city.baked[i] || l.end > tau) return;
        strokeAll(d, l, 1, pencil(city.ink[l.mark.tone]));
        city.baked[i] = 1;
      });
    };

    /** The city's name, under the ground at the right, written in from the left. */
    const label = (city: City, reveal: number, alpha: number) => {
      if (reveal <= 0 || alpha <= 0) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.font = `600 ${Math.round(Math.max(22, Math.min(30, box.width / 18)))}px ${hand}`;
      ctx.textAlign = 'right';
      ctx.textBaseline = 'alphabetic';
      const w = ctx.measureText(city.name).width;
      const x = box.width - 6;
      const y = box.ground + 34;
      ctx.save();
      ctx.beginPath();
      ctx.rect(x - w - 4, y - 40, (w + 8) * Math.min(1, reveal), 56);
      ctx.clip();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = city.ink[0];
      ctx.fillText(city.name, x, y);
      ctx.restore();
      ctx.globalAlpha = 1;
    };

    const period = T.draw + T.hold;
    // Once the title has been written — or straight away, when nothing moves.
    let now = reduced ? 0 : -delay;
    let last = 0;
    let raf = 0;
    let visible = true;
    let current: City | null = null;
    let previous: City | null = null;
    let groundDone = false;
    let still = ''; // what was last painted, when nothing is moving

    const paint = () => {
      const t = now;
      if (t < 0) return;
      const g = Math.min(1, T.ground ? t / T.ground : 1);
      if (!groundDone) {
        const gc = ground.getContext('2d')!;
        toUnits(gc);
        gc.clearRect(-10, -TALLEST - 20, units + 20, TALLEST + 80);
        stroke(gc, groundLine, g, pencil(graphite), 0.85);
        groundDone = g >= 1;
      }

      const index = Math.max(0, Math.floor((t - T.ground * 0.6) / period));
      const tau = t - T.ground * 0.6 - index * period;
      if (!current || current.index !== index) {
        if (current) {
          bake(current, Infinity);
          previous = current;
        }
        current = open(index);
      }
      const fading = previous && tau < T.fade ? 1 - tau / T.fade : 0;
      if (!fading) previous = null;

      // Nothing to redraw while a finished city, and its name, simply stand.
      const key = `${index}:${groundDone}`;
      const settled = tau > Math.max(T.draw, NAME_OUT + 0.9) + 0.1 && !fading;
      if (settled && still === key) return;
      still = settled ? key : '';

      bake(current, Math.max(0, tau));
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, W, H);
      // The skies first — the old one going, the new one brushed in from the
      // left — then the ground line over them, then the drawings.
      const a = previous && fading ? fading * fading * (3 - 2 * fading) : 0;
      if (previous && a) {
        ctx.globalAlpha = a;
        ctx.drawImage(previous.sky, 0, 0);
        ctx.globalAlpha = 1;
      }
      if (tau >= 0) {
        const across = reduced ? W : Math.min(1, tau / SKY_IN) * W;
        if (across > 0) ctx.drawImage(current.sky, 0, 0, across, H, 0, 0, across, H);
      }
      ctx.drawImage(ground, 0, 0);
      if (previous && a) {
        ctx.globalAlpha = a;
        ctx.drawImage(previous.done, 0, 0);
        ctx.globalAlpha = 1;
        // The old name goes first, so the new one is never written over it.
        label(previous, 1, Math.max(0, 1 - tau / NAME_OUT));
      }
      if (tau >= 0) {
        ctx.drawImage(current.done, 0, 0);
        toUnits(ctx);
        current.laid.forEach((l, i) => {
          if (current!.baked[i] || l.start > tau) return;
          strokeAll(ctx, l, (tau - l.start) / (l.end - l.start), pencil(current!.ink[l.mark.tone]));
        });
        label(current, reduced ? 1 : (tau - NAME_OUT) / 0.9, reduced ? Math.max(0, Math.min(1, (tau - NAME_OUT) / 0.6)) : 1);
      }
    };

    const frame = (time: number) => {
      raf = 0;
      // A clock that only runs while the drawing can be seen, so nothing is
      // missed while the tab is away or the cover scrolled off.
      if (last) now += Math.min(0.1, (time - last) / 1000);
      last = time;
      paint();
      if (visible && !document.hidden) raf = requestAnimationFrame(frame);
    };
    const sync = () => {
      if (visible && !document.hidden) {
        if (!raf) {
          last = 0;
          raf = requestAnimationFrame(frame);
        }
      } else {
        cancelAnimationFrame(raf);
        raf = 0;
      }
    };
    const view = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      sync();
    });
    view.observe(canvas);
    document.addEventListener('visibilitychange', sync);
    sync();

    return () => {
      cancelAnimationFrame(raf);
      view.disconnect();
      document.removeEventListener('visibilitychange', sync);
    };
  }, [box, entered, delay]);

  if (!box) return null;
  return (
    <canvas
      ref={ref}
      className="book-cover__skyline"
      aria-hidden="true"
      style={{ left: box.left, width: box.width, height: box.height }}
    />
  );
}
