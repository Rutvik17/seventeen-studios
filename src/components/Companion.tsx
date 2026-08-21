'use client';

/**
 * Mochi on the page.
 *
 * The character itself is `lib/companion.ts`; this file is the mount — canvas
 * sizing, the frame loop, pointer and scroll input, and the dialogue that
 * follows the visitor down the page.
 *
 * ---
 *
 * THE SPEECH BUBBLE IS DOM, NOT CANVAS
 *
 * Deliberately, and it is the accessibility decision in this component. Text
 * painted into a canvas does not exist: no screen reader reaches it, it cannot
 * be selected, translated, found by ctrl-F or resized by a reader's own font
 * settings. So the drawing is canvas and every word is real DOM in an
 * `aria-live` region. A visitor who never sees the animation still gets the
 * tour.
 *
 * ---
 *
 * IT CAN BE DISMISSED, AND IT STAYS DISMISSED
 *
 * A character that narrates a page is delightful once and an obstacle
 * thereafter. The close control is real, it is keyboard reachable, and the
 * choice persists for the session. Anything that follows the reader down a page
 * and cannot be turned off is an advert, whatever it is drawn as.
 *
 * ---
 *
 * REDUCED MOTION
 *
 * No RAF loop and no canvas at all: a still, hand-posed portrait plus the whole
 * script as text, presented at once. The information — who this is, what it is
 * rigged on, what it would have said — arrives complete. That is rule 5's
 * alternative expression rather than an absence, and it is also the honest
 * reading of a companion whose entire point is movement.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { gsap, ScrollTrigger, prefersReducedMotion } from '@/lib/gsap';
import { useIsomorphicLayoutEffect } from '@/hooks/useIsomorphicLayoutEffect';
import { Companion as Rig, COMPANION_BOUNDS, type CompanionPalette } from '@/lib/companion';
import { StepDriver, clamp } from '@/lib/physics';
import {
  companionCues,
  companionIntro,
  companionStaticLine,
  type CompanionCue,
} from '@/content/companion';

const DISMISS_KEY = 'seventeen:companion-dismissed';

export function Companion() {
  const [dismissed, setDismissed] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [ready, setReady] = useState(false);
  const [line, setLine] = useState('');

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rigRef = useRef<Rig | null>(null);
  /** Pointer in design units relative to the character's origin. */
  const pointerRef = useRef<{ x: number; y: number } | null>(null);
  const scrollAccRef = useRef(0);

  useEffect(() => {
    setReduced(prefersReducedMotion());
    try {
      setDismissed(sessionStorage.getItem(DISMISS_KEY) === '1');
    } catch {
      // Private mode throws on access. Not a reason to hide the companion.
    }
  }, []);

  const dismiss = useCallback(() => {
    setDismissed(true);
    try {
      sessionStorage.setItem(DISMISS_KEY, '1');
    } catch {
      /* nothing to persist to; the state still holds for this page */
    }
  }, []);

  /* ---------------- dialogue ---------------------------------------- */

  /**
   * Types a cue out one character at a time, nudging the rig on each character
   * so the body bounces in time with the text. The queue is a ref rather than
   * state because a re-render mid-type would restart it.
   */
  const typing = useRef<{ id: number; timer: number | null }>({ id: 0, timer: null });

  const say = useCallback(
    (cue: CompanionCue, instant: boolean) => {
      const rig = rigRef.current;
      rig?.setPose(cue.pose);

      const text = cue.lines.join(' ');
      typing.current.id += 1;
      const run = typing.current.id;
      if (typing.current.timer) window.clearTimeout(typing.current.timer);

      if (instant) {
        setLine(text);
        return;
      }

      let i = 0;
      const tick = () => {
        if (typing.current.id !== run) return;
        i += 1;
        setLine(text.slice(0, i));
        rigRef.current?.speak();
        if (i < text.length) {
          // Longer beat after sentence-ending punctuation: it reads as breath
          // rather than as a uniform teletype.
          const ch = text[i - 1];
          const pause = ch === '.' || ch === '—' ? 260 : 17;
          typing.current.timer = window.setTimeout(tick, pause);
        }
      };
      setLine('');
      typing.current.timer = window.setTimeout(tick, 220);
    },
    [],
  );

  /* ---------------- rig + frame loop -------------------------------- */

  useIsomorphicLayoutEffect(() => {
    if (dismissed || reduced) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rig = new Rig();
    rigRef.current = rig;
    const driver = new StepDriver();

    // Palette read from the live stylesheet rather than duplicated here. The
    // WebGL field on this site keeps a hand-copied mirror of the tokens and it
    // fails silently whenever the two drift; there is no reason to repeat that.
    const css = getComputedStyle(document.documentElement);
    const token = (name: string, fallback: string) =>
      css.getPropertyValue(name).trim() || fallback;
    const palette: CompanionPalette = {
      shell: token('--bg-raise', '#fbf8f1'),
      shellShade: token('--bg-sunk', '#e7e0d0'),
      visor: token('--fg', '#1a1714'),
      eye: token('--lantern', '#ffb865'),
      sash: token('--accent', '#c4402a'),
      ink: token('--fg', '#1a1714'),
      shadow: token('--fg', '#1a1714'),
    };

    let width = 0;
    let height = 0;
    let scale = 1;
    let originX = 0;
    let originY = 0;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = rect.width;
      height = rect.height;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Fit the character's design bounds into the element, preserving aspect.
      const bw = COMPANION_BOUNDS.maxX - COMPANION_BOUNDS.minX;
      const bh = COMPANION_BOUNDS.maxY - COMPANION_BOUNDS.minY;
      scale = Math.min(width / bw, height / bh);
      originX = width / 2;
      originY = height / 2 - ((COMPANION_BOUNDS.minY + COMPANION_BOUNDS.maxY) / 2) * scale;
    };

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);

    const onPointer = (e: PointerEvent) => {
      // Converted into the character's own design space, so the rig never has
      // to know anything about pixels or where on the page it was mounted.
      const rect = canvas.getBoundingClientRect();
      pointerRef.current = {
        x: (e.clientX - (rect.left + originX)) / scale,
        y: (e.clientY - (rect.top + originY)) / scale,
      };
    };
    const onLeave = () => {
      pointerRef.current = null;
    };
    window.addEventListener('pointermove', onPointer, { passive: true });
    window.addEventListener('pointerleave', onLeave);

    let lastVel = 0;
    let lastY = window.scrollY;
    let lastT = performance.now();

    const frame = () => {
      const now = performance.now();
      const dt = Math.min((now - lastT) / 1000, 0.25);
      lastT = now;

      // Scroll acceleration, differenced from real positions. The pendulum
      // wants an acceleration, and taking it from actual scroll means the
      // antenna reacts to how the page was moved, not to a number we invented.
      const yNow = window.scrollY;
      const vel = (yNow - lastY) / Math.max(dt, 1e-5);
      lastY = yNow;
      const acc = clamp((vel - lastVel) * 0.00004, -1, 1);
      lastVel = vel;
      scrollAccRef.current = acc;

      driver.advance(dt, (fixed) => rig.update(fixed, pointerRef.current, acc));

      ctx.clearRect(0, 0, width, height);
      ctx.save();
      ctx.translate(originX, originY);
      ctx.scale(scale, scale);
      rig.draw(ctx, palette);
      ctx.restore();
    };

    gsap.ticker.add(frame);
    setReady(true);

    return () => {
      gsap.ticker.remove(frame);
      observer.disconnect();
      window.removeEventListener('pointermove', onPointer);
      window.removeEventListener('pointerleave', onLeave);
      rigRef.current = null;
    };
  }, [dismissed, reduced]);

  /* ---------------- cue the script off the page --------------------- */

  useIsomorphicLayoutEffect(() => {
    if (dismissed || reduced || !ready) return;

    const intro = window.setTimeout(() => say(companionIntro, false), 900);

    const triggers = companionCues
      .map((cue) => {
        const el = document.getElementById(cue.section);
        if (!el) return null;
        return ScrollTrigger.create({
          trigger: el,
          start: 'top 62%',
          end: 'bottom 38%',
          onEnter: () => say(cue, false),
          onEnterBack: () => say(cue, false),
        });
      })
      .filter(Boolean) as ScrollTrigger[];

    return () => {
      window.clearTimeout(intro);
      triggers.forEach((t) => t.kill());
      if (typing.current.timer) window.clearTimeout(typing.current.timer);
    };
  }, [dismissed, reduced, ready, say]);

  if (dismissed) return null;

  if (reduced) {
    return (
      <aside className="companion companion--static">
        <p className="companion__bubble">
          <strong>Mochi.</strong> {companionStaticLine}
        </p>
        <button type="button" className="companion__close" onClick={dismiss}>
          Dismiss
        </button>
      </aside>
    );
  }

  return (
    <aside className="companion" aria-label="Studio companion">
      <div className="companion__bubble" aria-live="polite">
        {line || ' '}
      </div>
      <canvas ref={canvasRef} className="companion__canvas" aria-hidden="true" />
      <button
        type="button"
        className="companion__close"
        onClick={dismiss}
        aria-label="Dismiss the companion"
      >
        ✕
      </button>
    </aside>
  );
}
