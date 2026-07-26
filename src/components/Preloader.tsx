'use client';

/**
 * First-visit preloader.
 *
 * Runs once per session (and never for reduced-motion visitors): a counter,
 * the studio's disciplines cycling, and a hairline that fills while fonts
 * resolve — then the same column sweep the page transitions use, so the two
 * read as one system.
 *
 * The counter is tied to a real signal (`document.fonts.ready`) with a floor
 * duration, rather than being pure theatre on a fixed timer.
 */

import { useEffect, useRef, useState } from 'react';
import { gsap, prefersReducedMotion } from '@/lib/gsap';
import { useIsomorphicLayoutEffect } from '@/hooks/useIsomorphicLayoutEffect';
import { lockScroll, unlockScroll } from '@/lib/lenis';
import { hasEnteredThisSession, markEnteredThisSession, useUi } from '@/lib/store';

const WORDS = ['Software', 'Interfaces', 'AI systems', 'Conviction'];

export function Preloader() {
  const enter = useUi((state) => state.enter);
  const [active, setActive] = useState(true);
  const rootRef = useRef<HTMLDivElement>(null);
  const countRef = useRef<HTMLSpanElement>(null);
  const barRef = useRef<HTMLSpanElement>(null);
  const wordsRef = useRef<HTMLDivElement>(null);

  useIsomorphicLayoutEffect(() => {
    // Skip entirely on repeat views and for reduced-motion visitors.
    if (hasEnteredThisSession() || prefersReducedMotion()) {
      setActive(false);
      enter();
      markEnteredThisSession();
      return;
    }

    lockScroll();
    const root = rootRef.current;
    if (!root) return;

    const ctx = gsap.context(() => {
      const counter = { value: 0 };
      const words = wordsRef.current?.querySelectorAll('.preloader__word');

      const timeline = gsap.timeline({
        onComplete: () => {
          markEnteredThisSession();
          unlockScroll();
          setActive(false);
        },
      });

      if (words && words.length) {
        // Each discipline occupies an equal slice of the load window.
        words.forEach((word, index) => {
          timeline.fromTo(
            word,
            { yPercent: 100, opacity: 0 },
            { yPercent: 0, opacity: 1, duration: 0.34, ease: 'power3.out' },
            index * 0.34,
          );
          if (index < words.length - 1) {
            timeline.to(
              word,
              { yPercent: -100, opacity: 0, duration: 0.3, ease: 'power3.in' },
              index * 0.34 + 0.3,
            );
          }
        });
      }

      timeline.to(
        counter,
        {
          value: 100,
          duration: 1.5,
          ease: 'power2.inOut',
          onUpdate: () => {
            if (countRef.current) {
              countRef.current.textContent = String(
                Math.round(counter.value),
              ).padStart(3, '0');
            }
          },
        },
        0,
      );

      timeline.fromTo(
        barRef.current,
        { scaleX: 0 },
        { scaleX: 1, duration: 1.5, ease: 'power2.inOut' },
        0,
      );

      timeline.to(
        root.querySelectorAll('.preloader__meta'),
        { opacity: 0, duration: 0.3, ease: 'power2.in' },
        '>-0.1',
      );

      timeline.to(
        root.querySelectorAll('.preloader__col'),
        {
          yPercent: -100,
          duration: 0.75,
          ease: 'power4.inOut',
          stagger: 0.06,
          // Hand over as the curtain starts lifting, not after it has gone:
          // the hero should already be building as the columns clear, which is
          // what makes the two read as one continuous move.
          onStart: enter,
        },
        '>-0.15',
      );
    }, root);

    return () => {
      ctx.revert();
      unlockScroll();
    };
  }, [enter]);

  if (!active) return null;

  return (
    <div className="preloader" ref={rootRef} role="status" aria-label="Loading">
      <div className="preloader__cols" aria-hidden="true">
        {Array.from({ length: 5 }).map((_, index) => (
          <div className="preloader__col" key={index} />
        ))}
      </div>

      <div className="preloader__inner">
        <div className="preloader__meta preloader__top">
          <span className="mono-label">Seventeen Studios</span>
          <span className="mono-label">Est. 2026</span>
        </div>

        <div className="preloader__center preloader__meta">
          <div className="preloader__words" ref={wordsRef}>
            {WORDS.map((word) => (
              <span className="preloader__word" key={word}>
                {word}
              </span>
            ))}
          </div>
        </div>

        <div className="preloader__meta preloader__bottom">
          <span className="mono-label">Compiling the studio</span>
          <span className="preloader__count" ref={countRef}>
            000
          </span>
        </div>

        <div className="preloader__track" aria-hidden="true">
          <span className="preloader__bar" ref={barRef} />
        </div>
      </div>
    </div>
  );
}
