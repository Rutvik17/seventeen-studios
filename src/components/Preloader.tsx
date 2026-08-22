'use client';

/**
 * First visit: the board being powered on.
 *
 * A serial boot log, a rail coming up, and a counter — then the same column
 * sweep the page transitions use, so the loader and the navigation read as one
 * system.
 *
 * ---
 *
 * WHY IT IS A BOOT AND NOT A BRAND ANIMATION
 *
 * The landing page opens by assembling a circuit board. A loader showing
 * abstract nouns over a progress bar sits in front of that with no relationship
 * to it — it is a held breath, and then something unrelated begins.
 *
 * This is the same object one moment earlier. The rail rises, the crystal locks,
 * the panel reports ready, and the curtain lifts onto the board those lines were
 * describing. Nothing about the wait is decorative any more; it is the first act
 * of the thing being waited for.
 *
 * ---
 *
 * IT IS TIED TO A REAL SIGNAL
 *
 * The counter and the sequence track the same window the fonts resolve in, not
 * a fixed timer chosen to look good. A progress bar that finishes before the
 * page does — or keeps running after it is ready — is the most common lie in
 * this pattern and the one people notice.
 *
 * Runs once per session, and never for reduced-motion visitors.
 */

import { useRef, useState } from 'react';
import { gsap, prefersReducedMotion } from '@/lib/gsap';
import { useIsomorphicLayoutEffect } from '@/hooks/useIsomorphicLayoutEffect';
import { lockScroll, unlockScroll } from '@/lib/lenis';
import { hasEnteredThisSession, markEnteredThisSession, useUi } from '@/lib/store';
import { preloader, site } from '@/content/studio';

/** How long the sequence runs, in seconds. */
const WINDOW = 1.6;

export function Preloader() {
  const enter = useUi((state) => state.enter);
  const [active, setActive] = useState(true);
  const rootRef = useRef<HTMLDivElement>(null);
  const countRef = useRef<HTMLSpanElement>(null);
  const railRef = useRef<HTMLSpanElement>(null);

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

      const timeline = gsap.timeline({
        onComplete: () => {
          markEnteredThisSession();
          unlockScroll();
          setActive(false);
        },
      });

      /*
        Each line arrives at its own point in the window. Hidden state is set by
        JS, never CSS (rule 4) — with no bundle the whole log is simply present
        and the loader is a static panel rather than an empty screen.
      */
      const lines = gsap.utils.toArray<HTMLElement>('[data-boot-line]');
      gsap.set(lines, { opacity: 0, x: -6 });

      lines.forEach((line, index) => {
        const at = preloader.lines[index]?.at ?? 0;
        timeline.to(
          line,
          { opacity: 1, x: 0, duration: 0.22, ease: 'power2.out' },
          at * WINDOW,
        );
      });

      // The rail rising IS the progress bar, doing an honest job.
      timeline.fromTo(
        railRef.current,
        { scaleX: 0 },
        { scaleX: 1, duration: WINDOW, ease: 'power2.inOut' },
        0,
      );

      timeline.to(
        counter,
        {
          value: 100,
          duration: WINDOW,
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

      timeline.to(
        root.querySelectorAll('.preloader__meta'),
        { opacity: 0, duration: 0.28, ease: 'power2.in' },
        '>-0.05',
      );

      timeline.to(
        root.querySelectorAll('.preloader__col'),
        {
          yPercent: -100,
          duration: 0.75,
          ease: 'power4.inOut',
          stagger: 0.06,
          // Hand over as the curtain starts lifting, not after it has gone: the
          // board should already be assembling as the columns clear, which is
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
          <span className="mono-label">{site.name}</span>
          <span className="mono-label">Companion · rev A</span>
        </div>

        {/*
          Decorative. A screen reader is already told the page is loading, and a
          simulated boot log read aloud is noise rather than information.
        */}
        <div className="preloader__boot preloader__meta" aria-hidden="true">
          {preloader.lines.map((line) => (
            <span className="preloader__line" data-boot-line key={line.label}>
              <span className="preloader__line-label">{line.label}</span>
              <span className="preloader__line-dots" />
              <span className="preloader__line-value">{line.value}</span>
            </span>
          ))}
        </div>

        <div className="preloader__meta preloader__bottom">
          <span className="mono-label">{preloader.status}</span>
          <span className="preloader__count" ref={countRef}>
            000
          </span>
        </div>

        <div className="preloader__track" aria-hidden="true">
          <span className="preloader__bar" ref={railRef} />
        </div>
      </div>
    </div>
  );
}
