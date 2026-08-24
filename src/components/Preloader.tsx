'use client';

/**
 * First visit.
 *
 * The mark fills with water while the page resolves, then the columns sweep up
 * onto the board. It is the same screen the page transitions and the founder
 * page show — see `components/loader/LoaderScreen.tsx`.
 *
 * ---
 *
 * WHAT WAS HERE
 *
 * A simulated serial boot log: a reset reason, a ROM banner, a rail voltage, a
 * crystal locking. It was written to make the wait part of the landing — the
 * board being powered on one moment before it assembles — and as an idea it was
 * sound. What it was not was the same as anything else on the site. Changing
 * route showed a bare "17" on four sweeping columns, and the founder page showed
 * a filling numeral, so the site had three loading screens with three different
 * arguments and no relationship between them.
 *
 * One of them had to win, and it is the one that reports progress in the mark
 * itself.
 *
 * ---
 *
 * IT IS TIED TO A REAL SIGNAL
 *
 * The counter tracks the window the fonts resolve in, not a timer chosen to look
 * good. A progress bar that finishes before the page does — or keeps running
 * after it is ready — is the most common lie in this pattern and the one people
 * notice.
 *
 * Runs once per session, and never for reduced-motion visitors.
 */

import { useRef, useState } from 'react';
import { gsap, prefersReducedMotion } from '@/lib/gsap';
import { useIsomorphicLayoutEffect } from '@/hooks/useIsomorphicLayoutEffect';
import { lockScroll, unlockScroll } from '@/lib/lenis';
import { hasEnteredThisSession, markEnteredThisSession, useUi } from '@/lib/store';
import { LoaderScreen } from '@/components/loader/LoaderScreen';

/** How long the sequence runs, in seconds. */
const WINDOW = 1.9;

export function Preloader() {
  const enter = useUi((state) => state.enter);
  const [active, setActive] = useState(true);
  const [progress, setProgress] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);

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
        React state rather than a ref written straight to the DOM, because the
        number is not the only thing that consumes it — the water level follows
        it too, and both should read the same value on the same frame.

        It is one setState per frame for under two seconds, on a screen with
        nothing else mounted. The rule this bends is about gesture handlers.
      */
      timeline.to(counter, {
        value: 100,
        duration: WINDOW,
        ease: 'power1.inOut',
        onUpdate: () => setProgress(counter.value),
      });

      timeline.to(
        root.querySelectorAll('.loader'),
        { opacity: 0, duration: 0.3, ease: 'power2.in' },
        // A beat at 100 so the water actually reaches the top before it goes.
        // The level chases the counter, so it is always a little behind it.
        '>+0.4',
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

      <LoaderScreen progress={progress} />
    </div>
  );
}
