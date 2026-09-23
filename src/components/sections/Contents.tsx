'use client';

/**
 * THE LANDING — the sketchbook's contents page.
 *
 * The site is one sketchbook and this is where it opens: the title drawn in
 * pencil and hatched in, one line about what is inside, and the contents. Each
 * chapter is a page you can turn to, with a small drawing of what is on it that
 * draws itself when it comes into view and again when you point at it.
 *
 * It replaced two double pendulums with a readout. They were a demonstration
 * without a story; this is the story's table of contents, and the
 * demonstrations are one page-turn away.
 *
 * ---
 *
 * WITHOUT THE SCRIPT
 *
 * The title is a real `<h1>` set in the display face, and the doodles are
 * drawn. The canvas and the hidden starting states are applied by JavaScript
 * only — so a failed bundle leaves a plain contents page, not an empty one.
 *
 * REDUCED MOTION
 *
 * The title appears already drawn and does not shimmer; the doodles are drawn
 * from the start. Same page, nothing moving.
 */

import { useEffect, useRef } from 'react';
import { prefersReducedMotion } from '@/lib/gsap';
import { useUi } from '@/lib/store';
import { onceInView } from '@/lib/inview';
import { chapters, cover, type Chapter } from '@/content/studio';
import { TransitionLink } from '@/components/Transition';
import { drawWordmark, hatchedLetters, layoutWordmark } from '@/lib/sketch/wordmark';

const LINES = [
  { text: cover.wordmarkTop, align: 'left' as const },
  { text: cover.wordmarkBottom, align: 'right' as const },
];

/** Seconds for the pencil to draw and hatch the title. */
const DRAW_SECONDS = 2.6;
/** Stop-motion rate of the shimmer, frames per second. */
const BOIL_FPS = 5;

/** The small drawings beside each chapter, in a 120 x 80 box. */
const DOODLES: Record<Chapter['doodle'], string[]> = {
  head: [
    'M42 76 C40 62 30 56 28 44 C26 26 40 10 60 10 C78 10 90 22 90 36 L96 47 L89 49 L91 55 C89 60 85 61 81 61 L80 72',
    'M50 34 a9 9 0 1 0 18 0 a9 9 0 1 0 -18 0',
    'M59 20 L59 16 M72 26 L76 23 M46 26 L42 23',
  ],
  notebook: [
    'M60 16 C48 10 28 10 14 14 L14 70 C28 66 48 66 60 72 C72 66 92 66 106 70 L106 14 C92 10 72 10 60 16 Z',
    'M60 16 L60 72',
    'M24 28 L50 26 M24 38 L46 37 M70 26 L96 28 M70 37 L92 38',
    'M88 50 L100 38 L104 42 L92 54 Z',
  ],
  tangent: [
    'M14 12 Q60 116 106 12',
    'M28 70 L102 30',
    'M76 44 a4 4 0 1 0 0.1 0',
    'M14 74 L106 74',
  ],
};

function Doodle({ kind }: { kind: Chapter['doodle'] }) {
  return (
    <svg className="doodle" viewBox="0 0 120 80" aria-hidden="true">
      {DOODLES[kind].map((d, i) => (
        <path key={d} d={d} pathLength={1} style={{ ['--i' as string]: i }} />
      ))}
    </svg>
  );
}

export function Contents() {
  const root = useRef<HTMLElement>(null);
  const title = useRef<HTMLHeadingElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const list = useRef<HTMLOListElement>(null);
  const entered = useUi((s) => s.entered);

  /* ---- the doodles: armed hidden by script, drawn when seen ---- */
  useEffect(() => {
    const el = list.current;
    if (!el || prefersReducedMotion()) return;
    el.setAttribute('data-armed', '');
    return onceInView(el, () => el.classList.add('is-drawn'), { enter: 0.05 });
  }, []);

  /* ---- the title, in pencil ---- */
  useEffect(() => {
    const canvas = canvasRef.current;
    const h1 = title.current;
    if (!canvas || !h1) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const reduced = prefersReducedMotion();
    const ink = getComputedStyle(h1).color;
    const family = getComputedStyle(h1).fontFamily;
    let width = 0;
    let dpr = 1;
    let layout = { size: 0, lineHeight: 0, height: 0 };
    let hatch: HTMLCanvasElement | null = null;
    let start = 0;
    let boil = 0;
    let lastBoil = 0;
    let raf = 0;
    let visible = true;
    let cancelled = false;

    const measure = () => {
      width = canvas.parentElement?.clientWidth ?? 0;
      if (!width) return;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      layout = layoutWordmark(ctx, LINES, family, width);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(layout.height * dpr);
      canvas.style.height = `${layout.height}px`;
      hatch = hatchedLetters(LINES, family, width, layout, dpr, ink);
    };

    const paint = (progress: number) => {
      if (!hatch) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, layout.height);
      drawWordmark(ctx, { lines: LINES, family, width, layout, progress, boil, ink, hatch });
    };

    const frame = (now: number) => {
      raf = 0;
      if (!start) start = now;
      const t = (now - start) / 1000 / DRAW_SECONDS;
      const u = Math.min(1, t);
      const eased = u < 0.5 ? 2 * u * u : 1 - (-2 * u + 2) ** 2 / 2;
      if (now - lastBoil > 1000 / BOIL_FPS) {
        boil += 1;
        lastBoil = now;
      }
      paint(eased);
      if (visible && !document.hidden) raf = requestAnimationFrame(frame);
    };

    const sync = () => {
      if (reduced || !entered) return;
      if (visible && !document.hidden && !raf) raf = requestAnimationFrame(frame);
    };

    const view = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      sync();
    });
    const sizes = new ResizeObserver(() => {
      measure();
      paint(reduced ? 1 : start ? Math.min(1, (performance.now() - start) / 1000 / DRAW_SECONDS) : 0);
    });

    document.fonts.ready.then(() => {
      if (cancelled) return;
      measure();
      // The HTML title steps aside for the drawn one — applied here, by script,
      // so without it the page still has a title.
      h1.setAttribute('data-drawn', '');
      canvas.style.visibility = 'visible';
      paint(reduced ? 1 : 0);
      view.observe(canvas);
      sizes.observe(canvas.parentElement ?? canvas);
      document.addEventListener('visibilitychange', sync);
      sync();
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      view.disconnect();
      sizes.disconnect();
      document.removeEventListener('visibilitychange', sync);
    };
  }, [entered]);

  return (
    <section className="book-cover" id="top" ref={root}>
      <header className="book-cover__head">
        <p className="book-cover__shelfmark">{cover.shelfmark}</p>
        <p className="book-cover__owner">{cover.owner}</p>
      </header>

      <div className="book-cover__title">
        <h1 className="book-cover__wordmark" ref={title}>
          <span>{cover.wordmarkTop}</span> <span>{cover.wordmarkBottom}</span>
        </h1>
        <canvas className="book-cover__canvas" ref={canvasRef} aria-hidden="true" />
      </div>

      <p className="book-cover__line">{cover.line}</p>

      <nav className="contents" aria-label={cover.contents}>
        <h2 className="contents__head">{cover.contents}</h2>
        <ol className="contents__list" ref={list}>
          {chapters.map((c) => (
            <li key={c.href}>
              <TransitionLink href={c.href} className="contents__row" data-cursor={cover.cursor}>
                <span className="contents__numeral">{c.numeral}</span>
                <span className="contents__text">
                  <span className="contents__title">{c.title}</span>
                  <span className="contents__note">{c.note}</span>
                </span>
                <Doodle kind={c.doodle} />
                <span className="contents__arrow" aria-hidden="true">
                  →
                </span>
              </TransitionLink>
            </li>
          ))}
        </ol>
      </nav>
    </section>
  );
}
