'use client';

/**
 * THE LANDING — the sketchbook's contents page.
 *
 * The site is one sketchbook and this is where it opens: the title written
 * across it in crayon, one line about what is inside, and the contents. Each chapter is a page you can turn to, with a small drawing of
 * what is on it that draws itself when it comes into view and again when you
 * point at it.
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
 * The title appears already written; the doodles are drawn from the start.
 * Same page, nothing moving.
 */

import { useEffect, useRef } from 'react';
import { prefersReducedMotion } from '@/lib/gsap';
import { useUi } from '@/lib/store';
import { onceInView } from '@/lib/inview';
import { chapters, cover, type Chapter } from '@/content/studio';
import { IndexList } from '@/components/IndexList';
import { DrawIn } from '@/components/DrawIn';
import { drawWordmark, layoutWordmark, prepareWordmark, type WordmarkArt, type WordmarkLayout } from '@/lib/sketch/wordmark';

const LINES = [
  { text: cover.wordmarkTop, align: 'left' as const },
  { text: cover.wordmarkBottom, align: 'right' as const },
];

/** Which crayon from the box (`--crayon-n`) colours in each line of the title. */
const WORD_CRAYONS = [1, 2];

/** Seconds for the crayons to write the title, at a steady hand's pace. */
const WRITE_SECONDS = 3.2;

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

  /* ---- the title, written in crayon ---- */
  useEffect(() => {
    const canvas = canvasRef.current;
    const h1 = title.current;
    if (!canvas || !h1) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const reduced = prefersReducedMotion();
    const family = getComputedStyle(h1).fontFamily;
    // One crayon a word — the blue, then the marigold — read from the
    // stylesheet rather than written down twice.
    const tokens = getComputedStyle(document.documentElement);
    const colours = WORD_CRAYONS.map((i) => tokens.getPropertyValue(`--crayon-${i}`).trim());
    let width = 0;
    let dpr = 1;
    let layout: WordmarkLayout = { size: 0, height: 0, places: [] };
    let art: WordmarkArt | null = null;
    let start = 0;
    let raf = 0;
    let visible = true;
    let cancelled = false;

    const progress = (now: number) => (reduced ? 1 : start ? Math.min(1, (now - start) / 1000 / WRITE_SECONDS) : 0);

    const measure = () => {
      width = canvas.parentElement?.clientWidth ?? 0;
      if (!width) return;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      layout = layoutWordmark(ctx, LINES, family, width);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(layout.height * dpr);
      canvas.style.height = `${layout.height}px`;
      art = prepareWordmark(LINES, family, width, layout, dpr, colours);
    };

    const paint = (p: number) => {
      if (!art) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, layout.height);
      drawWordmark(ctx, { width, layout, progress: p, art });
    };

    // Written once, then left alone: nothing runs after the last stroke.
    const frame = (now: number) => {
      raf = 0;
      if (!start) start = now;
      const p = progress(now);
      paint(p);
      if (p < 1 && visible && !document.hidden) raf = requestAnimationFrame(frame);
    };

    const sync = () => {
      if (reduced || !entered || progress(performance.now()) >= 1) return;
      if (visible && !document.hidden && !raf) raf = requestAnimationFrame(frame);
    };

    const view = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      sync();
    });
    const sizes = new ResizeObserver(() => {
      measure();
      paint(progress(performance.now()));
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
        <p className="book-cover__shelfmark">
          {cover.shelfmark.name} <strong>{cover.shelfmark.number}</strong>
        </p>
        <p className="book-cover__owner">
          {cover.owner}
          <DrawIn className="book-cover__underline" viewBox="0 0 300 12" delay={0.2}>
            <path pathLength={1} d="M3 7C52 3.5 104 9 160 6S258 3.5 297 7" />
          </DrawIn>
        </p>
      </header>

      <div className="book-cover__title">
        <h1 className="book-cover__wordmark" ref={title}>
          <span>{cover.wordmarkTop}</span> <span>{cover.wordmarkBottom}</span>
        </h1>
        <canvas className="book-cover__canvas" ref={canvasRef} aria-hidden="true" />
      </div>

      <p className="book-cover__line">
        {cover.line} <span className="book-cover__motto">{cover.motto}</span>
      </p>

      <nav className="contents" aria-label={cover.contents}>
        <h2 className="contents__head">{cover.contents}</h2>
        <IndexList
          listRef={list}
          cursor={cover.cursor}
          items={chapters.map((c, i) => ({ key: c.href, href: c.href, mark: String(i + 1), title: c.title, note: c.note, art: <Doodle kind={c.doodle} /> }))}
        />
      </nav>
    </section>
  );
}
