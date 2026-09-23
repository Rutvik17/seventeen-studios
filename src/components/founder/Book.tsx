'use client';

/**
 * The founder page: the sketchbook itself.
 *
 * A closed book with a name on the cover. Lift the cover and it opens onto a
 * prologue; every page after is a chapter of the career — the left-hand page
 * says what happened, the right-hand page draws it — and the résumé is kept in
 * a pocket inside the back cover. Pages turn with the corner, the arrow keys,
 * the wheel or a swipe, and every turn is a real page turn: the old spread is
 * photographed and folded over the new one.
 *
 * The first page is a portrait, drawn in pencil and coloured pencil from a
 * photograph in the browser (`lib/sketch/portrait.ts`). The rest are
 * `lib/sketchbook` — the spark-and-bridge story for the EY chapter, and one
 * drawing each for the others. Every
 * frame is a function of how long the page has been open, so nothing is
 * accumulated and any page can be drawn at any moment.
 *
 * ---
 *
 * WITHOUT THE SCRIPT
 *
 * Every page is a real `<article>` in the document, stacked in reading order:
 * the whole story and the résumé downloads are there as plain text. The book —
 * one page at a time, the canvas, the turning — is switched on by script
 * (`data-mode="book"`), never by CSS.
 *
 * REDUCED MOTION
 *
 * Still a book, still paged; but the drawings arrive finished and pages change
 * without the turn. The same story, in stills.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { prefersReducedMotion } from '@/lib/gsap';
import { useUi } from '@/lib/store';
import { holdLoader } from '@/lib/ready';
import { book, founderPage, type BookPage } from '@/content/founder';
import { site } from '@/content/studio';
import { TransitionLink } from '@/components/Transition';
import { ContactLink } from '@/components/ContactLink';
import { DRAWINGS } from '@/lib/sketchbook/chapters';
import { T } from '@/lib/sketchbook/geometry';
import { createRenderer, type Palette, type Renderer, type View } from '@/lib/sketchbook/render';
import { createPortraitPainter, sketchPortrait } from '@/lib/sketch/portrait';
import styles from './Founder.module.css';

const TURN_MS = 900;
const LIFT_S = 1.8;

function readPalette(el: Element): Palette {
  const css = getComputedStyle(el);
  const v = (name: string, fallback: string) => css.getPropertyValue(name).trim() || fallback;
  return {
    paper: v('--sketch-paper', '#f3ead5'),
    paperEdge: v('--sketch-paper-edge', '#d8c59e'),
    graphite: v('--sketch-graphite', '#34343a'),
    charcoal: v('--sketch-charcoal', '#1d1d21'),
    ink: v('--sketch-ink', '#1f3a8a'),
    accent: v('--sketch-accent', '#c8233f'),
  };
}

/** How long a page keeps animating after it opens, seconds. */
function lifeOf(page: BookPage): number {
  if (page.scene.kind === 'cover') return T.bookDrawn + 0.2;
  if (page.scene.kind === 'portrait') return 4.6;
  if (page.scene.kind === 'story') return page.scene.to - page.scene.from + 0.3;
  return 5;
}

type Sizes = Record<string, string>;

export function Book({ sizes }: { sizes: Sizes }) {
  const root = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [index, setIndex] = useState(0);
  const [mode, setMode] = useState<'flow' | 'book'>('flow');
  /** Book mode is on and its first frame is painted; until then, nothing fades. */
  const [settled, setSettled] = useState(false);
  const entered = useUi((s) => s.entered);

  // Everything the animation loop needs, outside React's render cycle.
  const live = useRef({
    index: 0,
    opened: 0,
    lift: 0,
    lifting: false,
    turn: null as null | { start: number; forward: boolean; snap: HTMLCanvasElement },
    raf: 0,
    reduced: false,
    paint: null as null | Renderer,
    drawings: new Map<string, ReturnType<Renderer['prepareDrawing']>>(),
    portrait: null as null | ReturnType<typeof createPortraitPainter>,
    kick: () => {},
  });

  /* ---------------- the canvas ---------------- */

  useEffect(() => {
    const canvas = canvasRef.current;
    const section = root.current;
    if (!canvas || !section) return;

    const state = live.current;
    state.reduced = prefersReducedMotion();
    const hand = getComputedStyle(document.documentElement).getPropertyValue('--font-hand').trim() || 'cursive';
    const paint = createRenderer(canvas, readPalette(section), {
      hand,
      coverTitle: [book[0].title, book[0].kicker],
    });
    state.paint = paint;
    setMode('book');

    const views = () => {
      const { width, height } = paint.size();
      const wide = width >= 900;
      const full: View = { x: 0, y: 0, w: width, h: height };
      const right: View = wide
        ? { x: width / 2 + 36, y: 96, w: width / 2 - 96, h: height - 190 }
        : { x: 12, y: 74, w: width - 24, h: height * 0.42 };
      return { wide, full, right };
    };

    const drawingFor = (page: BookPage) => {
      if (page.scene.kind !== 'sketch') return null;
      const id = page.scene.drawing;
      let d = state.drawings.get(id);
      if (!d) {
        d = paint.prepareDrawing(DRAWINGS[id](), 1000 + state.drawings.size * 100);
        state.drawings.set(id, d);
      }
      return d;
    };

    const drawPage = (i: number, tau: number) => {
      const page = book[i];
      const { wide, full, right } = views();
      paint.paper(page.scene.kind === 'cover' ? 0 : 1);
      const t = state.reduced ? 99 : tau;
      if (page.scene.kind === 'cover') {
        const tOld = state.lifting || state.lift > 0 ? T.bookDrawn + state.lift * (T.zoomEnd - T.bookDrawn) : Math.min(t, T.bookDrawn);
        paint.story(tOld, full);
        return;
      }
      if (wide) paint.gutter();
      if (page.scene.kind === 'portrait') {
        const ctx = canvas.getContext('2d');
        if (ctx && state.portrait) state.portrait(ctx, t, right);
      } else if (page.scene.kind === 'story') paint.story(Math.min(page.scene.from + t, page.scene.to), right);
      else {
        const d = drawingFor(page);
        if (d) paint.sketch(d, t, right);
      }
    };

    const frame = (now: number) => {
      state.raf = 0;
      const i = state.index;
      const tau = (now - state.opened) / 1000;

      if (state.lifting) {
        state.lift = Math.min(1, tau / LIFT_S);
        drawPage(0, tau);
        if (state.lift >= 1) {
          // The cover is open: the prologue is the page underneath.
          state.lifting = false;
          state.lift = 0;
          state.index = 1;
          state.opened = now;
          setIndex(1);
        }
        state.raf = requestAnimationFrame(frame);
        return;
      }

      drawPage(i, tau);
      if (state.turn) {
        const e = (now - state.turn.start) / TURN_MS;
        if (e >= 1) state.turn = null;
        else paint.turnFrom(state.turn.snap, e, state.turn.forward);
      }
      const busy = state.turn || tau < lifeOf(book[i]);
      if (busy && !document.hidden) state.raf = requestAnimationFrame(frame);
    };

    state.kick = () => {
      if (!state.raf) state.raf = requestAnimationFrame(frame);
    };

    const sizesObs = new ResizeObserver(() => {
      paint.resize();
      drawPage(state.index, (performance.now() - state.opened) / 1000);
      state.kick();
    });
    sizesObs.observe(canvas);
    document.addEventListener('visibilitychange', state.kick);

    paint.resize();
    state.opened = performance.now();
    state.kick();

    // The loader stays up until the book has switched on and painted: the
    // reader sees the book, never the chapters stacked before it takes them in
    // hand. Two frames — one for the mode to render, one for the first paint.
    const release = holdLoader();
    let settle = requestAnimationFrame(() => {
      settle = requestAnimationFrame(() => {
        setSettled(true);
        release();
      });
    });

    // The portrait is drawn from the photograph once, off the main path; if its
    // page is already open when it is ready, it draws itself in from the start.
    let alive = true;
    sketchPortrait(founderPage.portrait)
      .then((s) => {
        if (!alive) return;
        state.portrait = createPortraitPainter(s);
        if (book[state.index].scene.kind === 'portrait') state.opened = performance.now();
        state.kick();
      })
      .catch(() => {
        /* No portrait: the page keeps its words, and the drawing side stays blank paper. */
      });

    return () => {
      alive = false;
      cancelAnimationFrame(settle);
      release();
      cancelAnimationFrame(state.raf);
      state.raf = 0;
      sizesObs.disconnect();
      document.removeEventListener('visibilitychange', state.kick);
    };
  }, []);

  // The cover draws itself once the preloader has gone, not behind it.
  useEffect(() => {
    if (!entered) return;
    live.current.opened = performance.now();
    live.current.kick();
  }, [entered]);

  /* ---------------- turning ---------------- */

  const go = useCallback((to: number) => {
    const state = live.current;
    const paint = state.paint;
    if (!paint || state.turn || state.lifting) return;
    const from = state.index;
    const target = (to + book.length) % book.length;
    if (target === from) return;

    // Lifting the cover is its own movement: the book opens rather than turns.
    if (from === 0 && target === 1 && !state.reduced) {
      state.lifting = true;
      state.opened = performance.now();
      state.kick();
      return;
    }

    if (!state.reduced) state.turn = { start: performance.now(), forward: target > from, snap: paint.snapshot() };
    state.index = target;
    state.opened = performance.now();
    setIndex(target);
    state.kick();
  }, []);

  /* Keys, wheel and swipe — only while the book is on screen. */
  useEffect(() => {
    const section = root.current;
    if (!section || mode !== 'book') return;

    const inView = () => {
      const r = section.getBoundingClientRect();
      return r.top < window.innerHeight * 0.5 && r.bottom > window.innerHeight * 0.5;
    };

    const onKey = (e: KeyboardEvent) => {
      if (!inView() || e.defaultPrevented) return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        e.preventDefault();
        go(live.current.index + 1);
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        go(live.current.index - 1);
      }
    };

    let lastWheel = 0;
    const onWheel = (e: WheelEvent) => {
      const i = live.current.index;
      const down = e.deltaY > 0;
      // Past the last page, the wheel scrolls on to the foot of the site.
      if ((down && i === book.length - 1) || (!down && i === 0)) return;
      e.preventDefault();
      if (Math.abs(e.deltaY) < 12) return;
      const now = performance.now();
      if (now - lastWheel < 1100) return;
      lastWheel = now;
      go(i + (down ? 1 : -1));
    };

    let touchX: number | null = null;
    const onTouchStart = (e: TouchEvent) => {
      touchX = e.touches[0].clientX;
    };
    const onTouchEnd = (e: TouchEvent) => {
      if (touchX === null) return;
      const dx = e.changedTouches[0].clientX - touchX;
      touchX = null;
      if (Math.abs(dx) > 60) go(live.current.index + (dx < 0 ? 1 : -1));
    };

    window.addEventListener('keydown', onKey);
    section.addEventListener('wheel', onWheel, { passive: false });
    section.addEventListener('touchstart', onTouchStart, { passive: true });
    section.addEventListener('touchend', onTouchEnd);
    return () => {
      window.removeEventListener('keydown', onKey);
      section.removeEventListener('wheel', onWheel);
      section.removeEventListener('touchstart', onTouchStart);
      section.removeEventListener('touchend', onTouchEnd);
    };
  }, [mode, go]);

  const page = book[index];

  return (
    <section
      ref={root}
      className={styles.book}
      data-mode={mode === 'book' ? 'book' : undefined}
      data-settled={settled ? '' : undefined}
      data-lenis-prevent={mode === 'book' ? '' : undefined}
      aria-label="Sketchbook"
    >
      <canvas ref={canvasRef} className={styles.canvas} aria-hidden="true" />
      <p className="sr-only">{founderPage.description}</p>

      <div className={styles.pages}>
        {book.map((p, i) => (
          <article
            key={p.id}
            className={styles.page}
            data-kind={p.scene.kind}
            data-current={mode !== 'book' || i === index ? '' : undefined}
            aria-hidden={mode === 'book' && i !== index ? true : undefined}
          >
            <p className={styles.kicker}>{p.kicker}</p>
            {i === 0 ? <h1 className={styles.title}>{p.title}</h1> : <h2 className={styles.title}>{p.title}</h2>}
            <p className={styles.body}>{p.body}</p>
            {p.meta && <p className={`${styles.meta} mono-label`}>{p.meta}</p>}

            {p.links && (
              <ul className={styles.links}>
                {p.links.map((l) => (
                  <li key={l.href}>
                    <TransitionLink href={l.href} data-cursor="Turn to it">
                      {l.label} →
                    </TransitionLink>
                  </li>
                ))}
              </ul>
            )}

            {p.pocket && (
              <div className={styles.pocket}>
                <div className={styles.downloads}>
                  {founderPage.downloads.map((d) => (
                    <a key={d.format} className={styles.download} href={d.href} download data-cursor="Take a copy">
                      <span className={styles.format}>{d.format}</span>
                      <span className={styles.dnote}>{d.note}</span>
                      <span className={`${styles.size} mono-label`}>{sizes[d.format]}</span>
                    </a>
                  ))}
                </div>
                <p className={styles.reach}>
                  <ContactLink className={styles.write} data-cursor="Write">
                    {founderPage.contact}
                  </ContactLink>
                  {site.social
                    .filter((s) => !('contact' in s))
                    .map((s) => (
                      <a key={s.label} href={s.href} target="_blank" rel="noreferrer noopener">
                        {s.label}
                      </a>
                    ))}
                </p>
              </div>
            )}
          </article>
        ))}
      </div>

      {mode === 'book' && (
        <>
          <nav className={styles.tabs} aria-label="Chapters">
            {book.map((p, i) => (
              <button
                key={p.id}
                type="button"
                className={styles.tab}
                aria-current={i === index ? 'page' : undefined}
                onClick={() => go(i)}
              >
                {p.tab}
              </button>
            ))}
          </nav>

          {index > 0 && (
            <button type="button" className={styles.back} onClick={() => go(index - 1)}>
              ← {founderPage.back}
            </button>
          )}

          <button
            type="button"
            className={styles.corner}
            onClick={() => go(index + 1)}
            data-cursor="Turn the page"
            aria-label={`Turn the page: ${page.next}`}
          >
            <span className={styles.fold} aria-hidden="true" />
            <span className={styles.cornerLabel}>{page.next} →</span>
          </button>

          <p className={`${styles.hint} mono-label`} aria-hidden="true">
            {founderPage.turnHint}
          </p>
        </>
      )}
    </section>
  );
}
