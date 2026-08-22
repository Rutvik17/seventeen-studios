'use client';

/**
 * THE CITY — the whole page, and the only thing on it.
 *
 * ==================================================================
 * HOW IT WORKS
 * ==================================================================
 *
 * One full-screen canvas, pinned. Scroll drives a camera along a route through
 * a three-dimensional New York; the renderer draws that city as a pen-and-wash
 * drawing every frame. Cards appear beside the buildings they are about, joined
 * to them by a line drawn to wherever that building actually lands on the page.
 *
 * ==================================================================
 * THE CAMERA IS SCROLL, THE CLOCK IS TIME
 * ==================================================================
 *
 * Two separate things move, and keeping them separate is what stops the scene
 * feeling either dead or seasick:
 *
 *   scroll  →  where the camera is
 *   time    →  what moves on its own — clouds, traffic, rain, the rocket
 *
 * So the city keeps living while you sit still, and stops nothing when you
 * scroll. Tying the animation to scroll would freeze the traffic whenever you
 * stopped reading, which is instantly wrong; tying the camera to time would take
 * the story away from you.
 *
 * ==================================================================
 * WHY IT REDRAWS EVERY FRAME
 * ==================================================================
 *
 * There is no scene graph and nothing is cached between frames. The whole city
 * is regenerated from its rules and repainted, sixty times a second.
 *
 * That sounds wasteful and is not: the generation is a hash lookup per block,
 * the renderer draws about a thousand volumes, and everything is bounded by the
 * budgets in `render.ts` rather than by how big the city is. It also means
 * there is no state to get stale — scrub the scroll backwards and you get the
 * identical frame, because a frame is a pure function of (camera, clock).
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { gsap, ScrollTrigger, prefersReducedMotion } from '@/lib/gsap';
import { useIsomorphicLayoutEffect } from '@/hooks/useIsomorphicLayoutEffect';
import { makeCamera, mixCamera, project, type Camera } from '@/lib/city/camera';
import { renderCity } from '@/lib/city/render';
import { paletteForHour, type Palette } from '@/lib/city/sketch';
import { BEATS } from '@/content/city-story';
import { founder } from '@/content/founder';

/** How many viewport-heights of scroll each beat gets. */
const BEAT_SCROLL = 1.35;

export function City() {
  const root = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const card = useRef<HTMLElement>(null);

  /* Mutable per-frame state, deliberately outside React: touching state here
     would re-render the tree sixty times a second for no benefit. */
  const progress = useRef(0);
  const camera = useRef<Camera>(makeCamera());
  const anchors = useRef<{ x: number; y: number }[]>([]);
  const frame = useRef(0);

  const [reduced, setReduced] = useState(false);
  const [active, setActive] = useState(0);
  const [palette, setPalette] = useState<Palette>(() => paletteForHour(12));
  const [lines, setLines] = useState<{ x: number; y: number } | null>(null);
  const [hook, setHook] = useState<{ x: number; y: number } | null>(null);

  /* ---------------------------------------------------------------
     The camera for a given scroll position.
     --------------------------------------------------------------- */
  const cameraAt = useCallback((t: number, width: number, height: number): Camera => {
    const span = Math.max(1, BEATS.length - 1);
    const at = Math.max(0, Math.min(span, t * span));
    const i = Math.min(BEATS.length - 2, Math.floor(at));
    const local = at - i;

    const base = { width, height };
    const a = makeCamera({ ...base, ...BEATS[i].camera });
    const b = makeCamera({ ...base, ...BEATS[i + 1].camera });
    // Eased per segment so each beat settles before the next pull, rather than
    // the camera sliding at a constant rate through the whole route.
    const e = local < 0.5 ? 2 * local * local : 1 - Math.pow(-2 * local + 2, 2) / 2;
    return mixCamera(a, b, e);
  }, []);

  /*
    Where the tether meets the card.

    Measured from the card's own box rather than assumed, because the card's
    height depends on how much this beat has to say. A fixed offset is right for
    one beat and wrong for the next.
  */
  useEffect(() => {
    const measure = () => {
      const el = card.current;
      const stageEl = stage.current;
      if (!el || !stageEl) return;
      const r = el.getBoundingClientRect();
      const s = stageEl.getBoundingClientRect();
      const current = BEATS[Math.min(active, BEATS.length - 1)];
      setHook({
        x: (current.side === 'left' ? r.right : r.left) - s.left,
        y: r.top - s.top + 34,
      });
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [active]);

  /* ---------------------------------------------------------------
     The clock. The viewer's own, so the drawing agrees with their window.
     --------------------------------------------------------------- */
  useEffect(() => {
    const now = new Date();
    setPalette(paletteForHour(now.getHours() + now.getMinutes() / 60));
  }, []);

  /* ---------------------------------------------------------------
     Scroll.
     --------------------------------------------------------------- */
  useIsomorphicLayoutEffect(() => {
    const el = root.current;
    const stageEl = stage.current;
    if (!el || !stageEl) return;

    const low = prefersReducedMotion();
    setReduced(low);
    if (low) return;

    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: el,
        start: 'top top',
        end: 'bottom bottom',
        pin: stageEl,
        pinSpacing: false,
        scrub: true,
        onUpdate: (self) => {
          progress.current = self.progress;
          const span = Math.max(1, BEATS.length - 1);
          const near = Math.round(self.progress * span);
          setActive((prev) => (prev === near ? prev : near));
        },
      });
    }, el);

    ScrollTrigger.refresh();
    return () => ctx.revert();
  }, []);

  /* ---------------------------------------------------------------
     The frame loop.
     --------------------------------------------------------------- */
  useEffect(() => {
    if (reduced) return;
    const el = canvas.current;
    if (!el) return;
    const ctx2d = el.getContext('2d', { alpha: false });
    if (!ctx2d) return;

    let width = 0;
    let height = 0;
    const start = performance.now();

    const resize = () => {
      const rect = el.getBoundingClientRect();
      // Capped: a 4K display at devicePixelRatio 2 is 33 million pixels a
      // frame, and the drawing is line work — it gains almost nothing past 2.
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = Math.round(rect.width);
      height = Math.round(rect.height);
      el.width = Math.round(width * dpr);
      el.height = Math.round(height * dpr);
      ctx2d.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(el);

    const tick = (now: number) => {
      const time = (now - start) / 1000;
      const cam = cameraAt(progress.current, width, height);
      camera.current = cam;

      const span = Math.max(1, BEATS.length - 1);
      const at = Math.max(0, Math.min(span, progress.current * span));
      const i = Math.min(BEATS.length - 1, Math.round(at));
      const beat = BEATS[i];

      renderCity(ctx2d, cam, {
        palette,
        time,
        radius: beat.render?.radius,
        massRadius: beat.render?.massRadius,
      });

      // Where this beat's building actually is on the page, this frame.
      const p = project(cam, beat.anchor);
      setLines((prev) => {
        if (!p) return prev === null ? prev : null;
        const next = { x: Math.round(p.x), y: Math.round(p.y) };
        if (prev && prev.x === next.x && prev.y === next.y) return prev;
        return next;
      });

      frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frame.current);
      observer.disconnect();
    };
  }, [reduced, palette, cameraAt]);

  /* --------------------------------------------------------------- */

  if (reduced) {
    return (
      <div className="city city--static">
        <h1>{founder.name}</h1>
        <p className="city__standfirst">{founder.standfirst}</p>
        <ol className="city__list">
          {BEATS.map((beat) => (
            <li key={beat.id}>
              <span className="mono-label">{beat.kicker}</span>
              <h2>{beat.title}</h2>
              {beat.body.map((line) => (
                <p key={line}>{line}</p>
              ))}
              {beat.points ? (
                <ul>
                  {beat.points.map((point) => (
                    <li key={point}>{point}</li>
                  ))}
                </ul>
              ) : null}
            </li>
          ))}
        </ol>
      </div>
    );
  }

  const beat = BEATS[Math.min(active, BEATS.length - 1)];

  return (
    <div
      className="city"
      ref={root}
      style={{ height: `${BEATS.length * BEAT_SCROLL * 100}vh` }}
    >
      <div className="city__stage" ref={stage}>
        <canvas
          className="city__canvas"
          ref={canvas}
          role="img"
          aria-label="A hand-drawn New York, flown through as you scroll."
        />

        {/* The tether. Drawn to where the building is, not to where the card
            wishes it were. */}
        {lines && hook ? (
          <svg className="city__tether" aria-hidden="true">
            {/* Two segments with a bend, the way a hand-drawn callout runs: out
                from the card, then a diagonal across to the building. */}
            <polyline
              className="city__tether-line"
              points={[
                `${hook.x},${hook.y}`,
                `${hook.x + (beat.side === 'left' ? 36 : -36)},${hook.y}`,
                `${lines.x},${lines.y}`,
              ].join(' ')}
            />
            <circle className="city__tether-dot" cx={lines.x} cy={lines.y} r={4.5} />
            <circle className="city__tether-hub" cx={hook.x} cy={hook.y} r={2.5} />
          </svg>
        ) : null}

        <article
          key={beat.id}
          ref={card}
          className={`city__card city__card--${beat.side}`}
          aria-live="polite"
        >
          <span className="mono-label city__kicker">{beat.kicker}</span>
          <h2 className="city__title">{beat.title}</h2>
          {beat.body.map((line) => (
            <p className="city__body" key={line}>
              {line}
            </p>
          ))}
          {beat.points ? (
            <ul className="city__points">
              {beat.points.map((point) => (
                <li key={point}>{point}</li>
              ))}
            </ul>
          ) : null}
          {beat.tags ? (
            <p className="city__tags">
              {beat.tags.map((tag) => (
                <em key={tag}>{tag}</em>
              ))}
            </p>
          ) : null}
        </article>

        <div className="city__progress" aria-hidden="true">
          {BEATS.map((b, i) => (
            <span key={b.id} className={i === active ? 'is-active' : undefined} />
          ))}
        </div>
      </div>
    </div>
  );
}
