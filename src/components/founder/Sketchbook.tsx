'use client';

/**
 * The founder page's opening: a sketchbook that draws a story on itself.
 *
 * Five scenes, about twenty-three seconds: a closed book opens onto a gridded
 * page; a spark draws a head in profile and an idea inside it; a swarm of
 * scribbles and ink drops breaks the drawing apart; the pieces come back as a
 * clean drawing of a suspension bridge, the one moment the crimson is used;
 * and the page settles behind a card with the name on it and a way in.
 *
 * All of the drawing is `lib/sketchbook` — geometry and timing in one file,
 * painting in the other. This component owns the clock, the controls and the
 * card, and nothing else.
 *
 * ---
 *
 * THE CARD IS HTML, AND IT IS THERE WITHOUT THE ANIMATION
 *
 * The name, the title and the button are real elements over the canvas, not
 * pixels in it: they are selectable, announced, and present if the script never
 * runs. They are hidden by JavaScript at mount and revealed on the story's cue,
 * never hidden by CSS — so a failed bundle leaves a blank sketchbook with a name
 * on it rather than a blank page.
 *
 * ---
 *
 * REDUCED MOTION
 *
 * The story is shown as a storyboard instead of played: one frame from each of
 * the first four scenes, side by side on one sheet, captioned, with the card
 * underneath. Every frame of the story is a function of the time, so a
 * storyboard is just the renderer asked for four times at once. Turning the
 * page scrolls to the résumé without the page-turn.
 */

import { useEffect, useRef, useState, type MouseEvent } from 'react';
import { gsap, prefersReducedMotion } from '@/lib/gsap';
import { getLenis } from '@/lib/lenis';
import { useUi } from '@/lib/store';
import { founder, founderPage } from '@/content/founder';
import { END, roughRect, sceneAt, T } from '@/lib/sketchbook/geometry';
import { createRenderer, type Palette, type Renderer } from '@/lib/sketchbook/render';
import styles from './Founder.module.css';

/** One moment from each of the first four scenes, for the storyboard. */
const KEY_FRAMES = [2.1, 9.9, 13.4, 19.6];

const BUTTON = { w: 280, h: 64 };
const OUTLINE = roughRect(BUTTON.w, BUTTON.h, 17);

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

const label = (i: number) => `${String(i + 1).padStart(2, '0')} — ${founderPage.scenes[i]}`;

export function Sketchbook() {
  const root = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const card = useRef<HTMLDivElement>(null);
  const cta = useRef<HTMLAnchorElement>(null);
  const sceneLabel = useRef<HTMLParagraphElement>(null);
  const renderer = useRef<Renderer | null>(null);
  const clock = useRef({ t: 0, turn: 0, turning: false });
  const control = useRef<{ skip: () => void; replay: () => void } | null>(null);

  const entered = useUi((s) => s.entered);
  const [reduced, setReduced] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => setReduced(prefersReducedMotion()), []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const section = root.current;
    if (!canvas || !section) return;

    const paint = createRenderer(canvas, readPalette(section));
    renderer.current = paint;
    paint.resize();

    /* ---------------- reduced motion: the storyboard ---------------- */

    if (reduced) {
      paint.storyboard(KEY_FRAMES);
      const sizes = new ResizeObserver(() => {
        paint.resize();
        paint.storyboard(KEY_FRAMES);
      });
      sizes.observe(canvas);
      return () => sizes.disconnect();
    }

    /* ---------------- the performance ---------------- */

    const cardEl = card.current;
    const ctaEl = cta.current;
    const outline = ctaEl ? Array.from(ctaEl.querySelectorAll('path')) : [];
    const state = clock.current;
    let raf = 0;
    let last = 0;
    let visible = true;
    let scene = -1;
    let cardShown = false;
    let buttonShown = false;

    const ctx = gsap.context(() => {
      if (cardEl) gsap.set(cardEl, { autoAlpha: 0, y: 14 });
      if (ctaEl) gsap.set(ctaEl, { autoAlpha: 0 });
      gsap.set(outline, { strokeDasharray: 1, strokeDashoffset: 1 });
    }, section);

    const showCard = (fast: boolean) => {
      if (cardShown || !cardEl) return;
      cardShown = true;
      gsap.to(cardEl, { autoAlpha: 1, y: 0, duration: fast ? 0.4 : 1.1, ease: 'power2.out' });
    };
    const showButton = (fast: boolean) => {
      if (buttonShown || !ctaEl) return;
      buttonShown = true;
      gsap.to(ctaEl, { autoAlpha: 1, duration: fast ? 0.3 : 0.5 });
      gsap.to(outline, {
        strokeDashoffset: 0,
        duration: fast ? 0.4 : 0.9,
        stagger: 0.25,
        ease: 'power1.inOut',
        onComplete: () => ctaEl.setAttribute('data-live', 'true'),
      });
    };

    const writeLabel = (t: number) => {
      const i = sceneAt(t);
      if (i !== scene && sceneLabel.current) {
        scene = i;
        sceneLabel.current.textContent = label(i);
      }
    };

    const frame = (now: number) => {
      const dt = last ? Math.min((now - last) / 1000, 1 / 20) : 0;
      last = now;
      state.t = Math.min(END, state.t + dt);
      paint.draw(state.t, state.turn);
      writeLabel(state.t);
      if (state.t >= T.card) showCard(false);
      if (state.t >= T.button) showButton(false);
      if (state.t >= END) {
        raf = 0;
        setDone(true);
        return;
      }
      raf = requestAnimationFrame(frame);
    };

    const running = () => entered && visible && !document.hidden && state.t < END;
    const sync = () => {
      if (running() && !raf) {
        last = 0;
        raf = requestAnimationFrame(frame);
      } else if (!running() && raf) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
    };

    control.current = {
      skip: () => {
        state.t = END;
        paint.draw(state.t, state.turn);
        writeLabel(state.t);
        showCard(true);
        showButton(true);
        setDone(true);
        sync();
      },
      replay: () => {
        state.t = 0;
        cardShown = false;
        buttonShown = false;
        ctaEl?.removeAttribute('data-live');
        gsap.killTweensOf([cardEl, ctaEl, ...outline]);
        if (cardEl) gsap.set(cardEl, { autoAlpha: 0, y: 14 });
        if (ctaEl) gsap.set(ctaEl, { autoAlpha: 0 });
        gsap.set(outline, { strokeDashoffset: 1 });
        setDone(false);
        paint.draw(0);
        sync();
      },
    };

    const sizes = new ResizeObserver(() => {
      paint.resize();
      paint.draw(state.t, state.turn);
    });
    sizes.observe(canvas);

    const view = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      sync();
    });
    view.observe(canvas);
    document.addEventListener('visibilitychange', sync);

    paint.draw(state.t);
    writeLabel(state.t);
    if (state.t >= END) {
      showCard(true);
      showButton(true);
    }
    sync();

    return () => {
      cancelAnimationFrame(raf);
      sizes.disconnect();
      view.disconnect();
      document.removeEventListener('visibilitychange', sync);
      control.current = null;
      ctx.revert();
    };
  }, [entered, reduced]);

  /** Turn the page, then go to the résumé. */
  const enter = (event: MouseEvent<HTMLAnchorElement>) => {
    const target = document.getElementById('resume');
    if (!target) return;
    event.preventDefault();

    const go = () => {
      const lenis = getLenis();
      if (lenis) lenis.scrollTo(target, { duration: reduced ? 0 : 1.2, immediate: reduced });
      else target.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });
    };

    const state = clock.current;
    const paint = renderer.current;
    if (reduced || !paint || state.turning) {
      go();
      return;
    }

    state.turning = true;
    gsap.to(state, {
      turn: 1,
      duration: 0.9,
      ease: 'none',
      onUpdate: () => paint.draw(state.t, state.turn),
      onComplete: () => {
        go();
        // Put the finished page back once it is off screen, for the way back up.
        window.setTimeout(() => {
          state.turn = 0;
          state.turning = false;
          paint.draw(state.t, 0);
        }, 1400);
      },
    });
  };

  return (
    <section
      ref={root}
      className={styles.story}
      data-static={reduced ? 'true' : undefined}
      aria-label="Sketchbook"
    >
      <div className={styles.stage}>
        <canvas ref={canvasRef} className={styles.canvas} aria-hidden="true" />
        <p className="sr-only">{founderPage.description}</p>

        {!reduced && (
          <>
            <p ref={sceneLabel} className={`${styles.scene} mono-label`} aria-hidden="true">
              {label(0)}
            </p>
            <div className={styles.controls}>
              {done ? (
                <button type="button" className="mono-label" onClick={() => control.current?.replay()}>
                  {founderPage.replay}
                </button>
              ) : (
                <button type="button" className="mono-label" onClick={() => control.current?.skip()}>
                  {founderPage.skip}
                </button>
              )}
            </div>
          </>
        )}
      </div>

      {reduced && (
        <ol className={styles.captions}>
          {KEY_FRAMES.map((t, i) => (
            <li key={t} className="mono-label">
              {label(i)}
            </li>
          ))}
        </ol>
      )}

      <div ref={card} className={styles.card}>
        <h1 className={styles.name}>{founder.name}</h1>
        <p className={styles.title}>
          <span>{founder.title}</span>
          <span className={styles.sep} aria-hidden="true">
            —
          </span>
          <span>{founder.employer}</span>
        </p>
        <a ref={cta} href="#resume" className={styles.cta} onClick={enter} data-cursor="Enter">
          <svg
            className={styles.outline}
            viewBox={`0 0 ${BUTTON.w} ${BUTTON.h}`}
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            {OUTLINE.map((d) => (
              <path key={d} d={d} pathLength={1} />
            ))}
          </svg>
          <span>{founderPage.cta}</span>
        </a>
      </div>
    </section>
  );
}
