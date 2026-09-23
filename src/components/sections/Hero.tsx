'use client';

/**
 * THE LANDING — two double pendulums, released one billionth of a radian apart.
 *
 * They move as one for about ten seconds and then separate completely: the
 * clearest demonstration there is that "deterministic" and "predictable" are
 * different words. The readout beside them prints the gap between the tips,
 * the rate that gap grows at — fitted, not asserted — and the energy the
 * integrator has failed to conserve, which is the check that the divergence is
 * the physics and not the arithmetic. The model is `lib/pendulum.ts`.
 *
 * Drag the tip (or tap, on a touch screen) to release them from somewhere
 * else.
 *
 * ---
 *
 * WHY CANVAS AND NOT SVG
 *
 * The trails are two polylines of about nine hundred points each, rewritten
 * every frame with a fade along their length. As SVG that is a path attribute
 * rebuilt sixty times a second and a style recalculation for every change; on
 * a canvas it is one clear and a few hundred line segments.
 *
 * ---
 *
 * REDUCED MOTION
 *
 * Nothing swings. The first twenty seconds are integrated in one go and drawn
 * as two finished traces, with the pendulums at their final pose and the
 * readout at its final values — the same information, as a drawing instead of
 * a performance. Tapping still re-runs it from the new start.
 */

import { useEffect, useRef, useState } from 'react';
import { prefersReducedMotion } from '@/lib/gsap';
import { useUi } from '@/lib/store';
import { hero } from '@/content/studio';
import {
  bobs,
  DT,
  EPSILON,
  formatLength,
  L1,
  L2,
  Pair,
  reach,
  START,
  tracePair,
  type State,
} from '@/lib/pendulum';

/** Trail length, in frames. About fifteen seconds at 60 Hz. */
const TRAIL = 900;
/** Simulated seconds before the pair is released again from the next start. */
const RUN_SECONDS = 45;
/** Seconds integrated for the reduced-motion drawing. */
const STATIC_SECONDS = 20;
/** Pixels a pointer must travel before a press becomes a drag. */
const DRAG_THRESHOLD = 4;

/*
  Where the pair is released from when a run ends on its own. Each is a pair of
  rod angles in degrees, all with both rods above horizontal — below that the
  motion is too gentle to diverge inside a run.
*/
const STARTS: [number, number][] = [
  [125, 160],
  [-140, -95],
  [170, 110],
  [-115, 175],
];

const toState = ([a, b]: [number, number]): State => ({
  t1: (a * Math.PI) / 180,
  t2: (b * Math.PI) / 180,
  w1: 0,
  w2: 0,
});

type Point = { x: number; y: number };

type Palette = { a: string; b: string; ink: string; faint: string };

function readPalette(el: Element): Palette {
  const css = getComputedStyle(el);
  const v = (name: string, fallback: string) => css.getPropertyValue(name).trim() || fallback;
  return {
    a: v('--accent', '#1b4fe0'),
    b: v('--accent-2', '#b4622a'),
    ink: v('--fg', '#14161a'),
    faint: v('--line', 'rgba(20,22,26,.12)'),
  };
}

/** 0.0000031 % — enough digits to show the first two that are not zero. */
function formatPercent(fraction: number): string {
  const v = Math.abs(fraction) * 100;
  if (v === 0) return '0 %';
  const digits = Math.min(12, Math.max(2, 1 - Math.floor(Math.log10(v))));
  return `${v.toFixed(digits)} %`;
}

type Readout = { time: string; gap: string; doubling: string; drift: string };

function readout(pair: Pair): Readout {
  const d = pair.doubling();
  return {
    time: `${pair.time.toFixed(2)} s`,
    gap: formatLength(pair.gap()),
    doubling: d ? `${d.toFixed(2)} s` : 'fitting…',
    drift: formatPercent(pair.drift),
  };
}

const INITIAL = readout(new Pair(START));

/** EPSILON as a power of ten, for the caption: 1e-9 → "−9". */
const EXPONENT = String(Math.round(Math.log10(EPSILON))).replace('-', '−');

export function Hero() {
  const root = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const out = useRef<Record<keyof Readout, HTMLElement | null>>({
    time: null,
    gap: null,
    doubling: null,
    drift: null,
  });
  const entered = useUi((s) => s.entered);
  const [reduced, setReduced] = useState(false);

  useEffect(() => setReduced(prefersReducedMotion()), []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const section = root.current;
    if (!canvas || !section) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const palette = readPalette(section);
    let width = 0;
    let height = 0;
    let scale = 1;
    let dpr = 1;

    let pair = new Pair(START);
    let startIndex = 0;
    const trailA: Point[] = [];
    const trailB: Point[] = [];
    let held: State | null = null;
    let visible = true;
    let raf = 0;
    let last = 0;
    let lastReadout = 0;

    const write = (r: Readout) => {
      for (const key of Object.keys(r) as (keyof Readout)[]) {
        const el = out.current[key];
        if (el && el.textContent !== r[key]) el.textContent = r[key];
      }
    };

    const toPx = (x: number, y: number): Point => ({
      x: width / 2 + x * scale,
      y: height / 2 + y * scale,
    });

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = rect.width;
      height = rect.height;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      scale = (Math.min(width, height) / 2 / (L1 + L2)) * 0.9;
    };

    const drawTrail = (trail: Point[], colour: string) => {
      const n = trail.length;
      if (n < 2) return;
      // In bands, oldest first, each a little more opaque than the last.
      const bands = 12;
      const per = Math.ceil(n / bands);
      ctx.strokeStyle = colour;
      ctx.lineWidth = 1.4;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      for (let band = 0; band < bands; band += 1) {
        const from = band * per;
        const to = Math.min(n - 1, from + per);
        if (to <= from) break;
        ctx.globalAlpha = reduced ? 0.75 : 0.08 + 0.87 * ((band + 1) / bands) ** 1.6;
        ctx.beginPath();
        const p0 = toPx(trail[from].x, trail[from].y);
        ctx.moveTo(p0.x, p0.y);
        for (let i = from + 1; i <= to; i += 1) {
          const p = toPx(trail[i].x, trail[i].y);
          ctx.lineTo(p.x, p.y);
        }
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    };

    const drawPendulum = (s: State, colour: string, filled: boolean) => {
      const b = bobs(s);
      const pivot = toPx(0, 0);
      const p1 = toPx(b.x1, b.y1);
      const p2 = toPx(b.x2, b.y2);
      ctx.strokeStyle = palette.ink;
      ctx.globalAlpha = filled ? 0.9 : 0.35;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(pivot.x, pivot.y);
      ctx.lineTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
      ctx.globalAlpha = 1;

      ctx.fillStyle = palette.ink;
      ctx.beginPath();
      ctx.arc(p1.x, p1.y, 3.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.arc(p2.x, p2.y, 6, 0, Math.PI * 2);
      if (filled) {
        ctx.fillStyle = colour;
        ctx.fill();
      } else {
        ctx.strokeStyle = colour;
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    };

    const draw = () => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);

      // The reach: the circle the tip can never leave.
      const pivot = toPx(0, 0);
      ctx.strokeStyle = palette.faint;
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 5]);
      ctx.beginPath();
      ctx.arc(pivot.x, pivot.y, (L1 + L2) * scale, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(pivot.x - 8, pivot.y);
      ctx.lineTo(pivot.x + 8, pivot.y);
      ctx.moveTo(pivot.x, pivot.y - 8);
      ctx.lineTo(pivot.x, pivot.y + 8);
      ctx.stroke();

      drawTrail(trailA, palette.a);
      drawTrail(trailB, palette.b);

      if (held) {
        drawPendulum(held, palette.a, true);
      } else {
        drawPendulum(pair.b, palette.b, false);
        drawPendulum(pair.a, palette.a, true);
      }
    };

    const push = () => {
      const a = bobs(pair.a);
      const b = bobs(pair.b);
      trailA.push({ x: a.x2, y: a.y2 });
      trailB.push({ x: b.x2, y: b.y2 });
      if (trailA.length > TRAIL) trailA.shift();
      if (trailB.length > TRAIL) trailB.shift();
    };

    const release = (start: State) => {
      held = null;
      trailA.length = 0;
      trailB.length = 0;
      if (reduced) {
        const run = tracePair(STATIC_SECONDS, start);
        pair = run.pair;
        trailA.push(...run.a);
        trailB.push(...run.b);
        write(readout(pair));
        draw();
        return;
      }
      pair = new Pair(start);
      write(readout(pair));
    };

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      // A long gap — a background tab, a stall — resumes rather than jumping.
      const elapsed = last ? Math.min((now - last) / 1000, 1 / 20) : 1 / 60;
      last = now;

      if (!held) {
        pair.advance(Math.max(1, Math.round(elapsed / DT)));
        push();
        if (pair.time > RUN_SECONDS) {
          startIndex = (startIndex + 1) % STARTS.length;
          release(toState(STARTS[startIndex]));
        }
      }
      if (now - lastReadout > 100) {
        lastReadout = now;
        if (!held) write(readout(pair));
      }
      draw();
    };

    const running = () => !reduced && visible && entered && !document.hidden;
    const sync = () => {
      if (running() && !raf) {
        last = 0;
        raf = requestAnimationFrame(frame);
      } else if (!running() && raf) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
    };

    /* ---- pointer ---- */

    const toMetres = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      return {
        x: (event.clientX - rect.left - width / 2) / scale,
        y: (event.clientY - rect.top - height / 2) / scale,
      };
    };

    let press: { x: number; y: number; id: number; type: string } | null = null;
    let dragging = false;

    const hold = (event: PointerEvent) => {
      const m = toMetres(event);
      const angles = reach(m.x, m.y);
      held = { ...angles, w1: 0, w2: 0 };
      trailA.length = 0;
      trailB.length = 0;
      write({ time: '0.00 s', gap: '—', doubling: '—', drift: '—' });
      if (!raf) draw();
    };

    const onDown = (event: PointerEvent) => {
      press = { x: event.clientX, y: event.clientY, id: event.pointerId, type: event.pointerType };
      dragging = false;
    };

    const onMove = (event: PointerEvent) => {
      if (!press || event.pointerId !== press.id) return;
      // Touch drags scroll the page instead; a tap still releases from there.
      if (press.type === 'touch') return;
      if (!dragging) {
        if (Math.hypot(event.clientX - press.x, event.clientY - press.y) < DRAG_THRESHOLD) return;
        // Captured only once it is a drag — see CLAUDE.md on pointer capture.
        dragging = true;
        canvas.setPointerCapture(event.pointerId);
      }
      hold(event);
    };

    const onUp = (event: PointerEvent) => {
      if (!press || event.pointerId !== press.id) return;
      if (!dragging) hold(event);
      const start = held;
      press = null;
      dragging = false;
      if (start) release(start);
    };

    const onCancel = () => {
      press = null;
      dragging = false;
      if (held) release(held);
    };

    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerup', onUp);
    canvas.addEventListener('pointercancel', onCancel);

    const sizeObserver = new ResizeObserver(() => {
      resize();
      draw();
    });
    sizeObserver.observe(canvas);

    const viewObserver = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      sync();
    });
    viewObserver.observe(canvas);

    document.addEventListener('visibilitychange', sync);

    resize();
    if (reduced) release(START);
    else push();
    draw();
    sync();

    return () => {
      cancelAnimationFrame(raf);
      sizeObserver.disconnect();
      viewObserver.disconnect();
      document.removeEventListener('visibilitychange', sync);
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerup', onUp);
      canvas.removeEventListener('pointercancel', onCancel);
    };
  }, [entered, reduced]);

  const rows: { key: keyof Readout; label: string; note: string }[] = [
    { key: 'time', label: 'Time', note: hero.readout.time },
    { key: 'gap', label: 'Gap', note: hero.readout.gap },
    { key: 'doubling', label: 'Gap doubles every', note: hero.readout.doubling },
    { key: 'drift', label: 'Energy error', note: hero.readout.drift },
  ];

  return (
    <section className="hero" ref={root} id="top">
      <h1 className="hero__wordmark hero__wordmark--top">{hero.wordmarkTop}</h1>
      <h2 className="hero__wordmark hero__wordmark--bottom">{hero.wordmarkBottom}</h2>
      <p className="hero__eyebrow mono-label">{hero.eyebrow}</p>
      <p className="hero__line">{hero.line}</p>

      <div className="hero__stage">
        <canvas
          ref={canvasRef}
          className="hero__canvas"
          role="img"
          aria-label={`Two double pendulums released 10 to the power ${EXPONENT} radians apart, tracing their paths. They move together, then diverge.`}
          data-cursor={hero.cursor}
        />
      </div>

      <aside className="hero__readout" aria-live="off">
        <p className="hero__caption">
          Two double pendulums, released 10<sup>{EXPONENT}</sup> rad apart.
        </p>
        <dl className="hero__figures">
          {rows.map((row) => (
            <div key={row.key} className="hero__figure">
              <dt className="mono-label">{row.label}</dt>
              <dd>
                <strong
                  ref={(el) => {
                    out.current[row.key] = el;
                  }}
                >
                  {/*
                    Constant on purpose. The frame loop writes these with
                    `textContent` ten times a second, and a React child that
                    later changed would be written into a text node the loop
                    has already replaced.
                  */}
                  {INITIAL[row.key]}
                </strong>
                <span className="hero__note">{row.note}</span>
              </dd>
            </div>
          ))}
        </dl>
        <p className="hero__hint mono-label">{reduced ? hero.hintStatic : hero.hint}</p>
      </aside>
    </section>
  );
}
