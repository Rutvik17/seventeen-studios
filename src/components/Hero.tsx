'use client';

/**
 * Hero — full-viewport intro.
 *
 * Layers:
 *   1. Three.js canvas (lazy, client-only)
 *   2. "17" background text stroke
 *   3. Title ("Seventeen / Studios") with per-character split animation
 *   4. Subtitle + availability badges
 *   5. Scroll hint
 *
 * Load choreography is split into two effects so the loader's exit can
 * hand off cleanly to the hero's entrance:
 *
 *   - `useLayoutEffect` (SSR-safe) — runs once on mount. Splits the
 *     title into chars and sets every animating element to its hidden
 *     starting state. This happens synchronously before paint so
 *     there's never a flash of final-state hero peeking through the
 *     loader curtains.
 *
 *   - `useEffect([ready])` — fires the instant the loader calls
 *     `markReady()` (mid-exit). Plays the reveal timeline. Because the
 *     loader's curtains are still closing when this fires, the title
 *     chars start climbing into view as the panels retract — which is
 *     what makes the transition feel continuous.
 */

import { useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import gsap from 'gsap';
import { splitChars } from '@/lib/gsap-animations';
import { useIsomorphicLayoutEffect } from '@/hooks/useIsomorphicLayoutEffect';
import { useLoaderStore } from '@/lib/loader-store';

// WebGL scene runs in the browser only — dynamic import disables SSR.
const HeroCanvas = dynamic(() => import('./HeroCanvas'), { ssr: false });

export function Hero() {
  const line1Ref = useRef<HTMLSpanElement | null>(null);
  const line2Ref = useRef<HTMLSpanElement | null>(null);
  const subRef = useRef<HTMLParagraphElement | null>(null);
  const badgesRef = useRef<HTMLDivElement | null>(null);
  const hintRef = useRef<HTMLDivElement | null>(null);

  // Refs that survive across the two effects — populated in setup,
  // consumed by the reveal timeline when `ready` flips true.
  const charsRef = useRef<{
    chars1: HTMLSpanElement[];
    chars2: HTMLSpanElement[];
  } | null>(null);
  const ctxRef = useRef<gsap.Context | null>(null);

  const ready = useLoaderStore((s) => s.ready);

  // SETUP: split the title, hide every animating element. Runs pre-paint.
  useIsomorphicLayoutEffect(() => {
    const l1 = line1Ref.current;
    const l2 = line2Ref.current;
    if (!l1 || !l2) return;

    const ctx = gsap.context(() => {
      const chars1 = splitChars(l1);
      const chars2 = splitChars(l2);
      gsap.set([...chars1, ...chars2], { yPercent: 110, opacity: 0 });
      gsap.set([subRef.current, badgesRef.current], { y: 30, opacity: 0 });
      gsap.set(hintRef.current, { opacity: 0 });
      charsRef.current = { chars1, chars2 };
    });
    ctxRef.current = ctx;

    return () => {
      ctx.revert();
      ctxRef.current = null;
      charsRef.current = null;
    };
  }, []);

  // REVEAL: plays exactly once when the loader signals ready.
  useEffect(() => {
    if (!ready) return;
    const ctx = ctxRef.current;
    const setup = charsRef.current;
    if (!ctx || !setup) return;

    ctx.add(() => {
      const tl = gsap.timeline();
      tl.to(
        setup.chars1,
        {
          yPercent: 0,
          opacity: 1,
          duration: 1.1,
          stagger: 0.04,
          ease: 'power4.out',
        },
        0.1,
      )
        .to(
          setup.chars2,
          {
            yPercent: 0,
            opacity: 1,
            duration: 1.1,
            stagger: 0.04,
            ease: 'power4.out',
          },
          '-=0.85',
        )
        .to(
          subRef.current,
          { y: 0, opacity: 1, duration: 0.9, ease: 'power3.out' },
          '-=0.5',
        )
        .to(
          badgesRef.current,
          { y: 0, opacity: 1, duration: 0.8, ease: 'power3.out' },
          '-=0.6',
        )
        .to(
          hintRef.current,
          { opacity: 1, duration: 1, ease: 'power2.out' },
          '-=0.2',
        );
    });
  }, [ready]);

  return (
    <section id="hero" className="hero">
      <HeroCanvas />
      <div className="hero-bg-number" aria-hidden="true">
        17
      </div>

      <div className="hero-content">
        <h1 className="hero-title">
          <span className="hero-line" ref={line1Ref}>
            Seventeen
          </span>
          <span className="hero-line" ref={line2Ref}>
            Studios
          </span>
        </h1>

        <div className="hero-bottom">
          <p className="hero-sub" ref={subRef}>
            A new kind of engineering studio. We build{' '}
            <strong>software</strong>, <strong>creative</strong>, and{' '}
            <strong>AI systems</strong> for companies with ambition that
            outpaces what ordinary agencies can deliver.
          </p>
          <div className="hero-badges" ref={badgesRef}>
            <span className="hero-badge accent">● Open for projects</span>
            <span className="hero-badge">Software Engineering</span>
            <span className="hero-badge">Creative Engineering</span>
            <span className="hero-badge">AI Engineering</span>
          </div>
        </div>
      </div>

      <div className="hero-scroll-hint" ref={hintRef}>
        <div className="scroll-line" />
        <span>Scroll</span>
      </div>
    </section>
  );
}
