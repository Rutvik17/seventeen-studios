'use client';

/**
 * The loader on a full page load.
 *
 * A pencil draws the mark while the page gets ready, then the sheet turns away
 * like a page. It is the same screen the page transitions show — see
 * `components/loader/LoaderScreen.tsx`.
 *
 * ---
 *
 * IT STAYS UNTIL THE PAGE IS READY — ON EVERY FULL LOAD
 *
 * It used to run once a session and skip reloads, so a reload of the founder
 * page showed its chapters piled on top of each other for a moment before the
 * book took them in hand. Now it covers every full load from the first frame
 * (the inline script in the document head puts it up before anything paints)
 * and leaves only when the fonts have arrived and every part of the page that
 * paints itself has said it is ready (`lib/ready.ts`).
 *
 * The first visit of a session gets the whole drawing; a reload gets a quicker
 * one. Either way the pencil stops at 90% if the page is not ready yet and
 * finishes the mark only when it is — the counter reports a real state, not a
 * timer chosen to look good.
 *
 * Reduced motion gets the finished mark, still, and no turn: the sheet is
 * simply gone when the page is ready.
 */

import { useRef, useState } from 'react';
import { gsap, prefersReducedMotion } from '@/lib/gsap';
import { useIsomorphicLayoutEffect } from '@/hooks/useIsomorphicLayoutEffect';
import { lockScroll, unlockScroll } from '@/lib/lenis';
import { hasEnteredThisSession, markEnteredThisSession, useUi } from '@/lib/store';
import { doneLoading, everythingReady } from '@/lib/ready';
import { LoaderScreen } from '@/components/loader/LoaderScreen';
import { turnAway } from '@/lib/pageTurn';

/** How long the pencil takes to draw the mark, seconds: a first visit, and a reload. */
const DRAW_FIRST = 1.9;
const DRAW_AGAIN = 0.7;

export function Preloader() {
  const enter = useUi((state) => state.enter);
  const [active, setActive] = useState(true);
  const [progress, setProgress] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);

  useIsomorphicLayoutEffect(() => {
    const root = rootRef.current;
    let alive = true;
    const finish = () => {
      doneLoading();
      markEnteredThisSession();
      unlockScroll();
      setActive(false);
    };
    lockScroll();
    const ready = everythingReady();

    if (prefersReducedMotion() || !root) {
      setProgress(100);
      void ready.then(() => {
        if (!alive) return;
        enter();
        finish();
      });
      return () => {
        alive = false;
        unlockScroll();
      };
    }

    let isReady = false;
    const ctx = gsap.context(() => {
      const counter = { value: 0 };
      const timeline = gsap.timeline({ onComplete: finish });

      /*
        React state rather than a ref written straight to the DOM, because the
        number is not the only thing that consumes it — the drawing follows it
        too, and both should read the same value on the same frame.
      */
      timeline.to(counter, {
        value: 90,
        duration: hasEnteredThisSession() ? DRAW_AGAIN : DRAW_FIRST,
        ease: 'power1.inOut',
        onUpdate: () => setProgress(counter.value),
      });
      // Wait here, at 90%, for the page — if it is not ready already.
      timeline.call(() => {
        if (!isReady) timeline.pause();
      });
      timeline.to(counter, { value: 100, duration: 0.3, ease: 'power1.out', onUpdate: () => setProgress(counter.value) });

      // A beat with the mark finished and hatched, before the page turns. The
      // drawing stays on the sheet and leaves with it, as it would on paper.
      timeline.to({}, { duration: 0.3 });

      // The loading sheet turns away onto the page. Hand over as it starts
      // lifting, not after it has gone: the page's entrance should already be
      // under way as it clears, which is what makes the two read as one move.
      const sheet = root.querySelector<HTMLElement>('.preloader__sheet');
      const edge = root.querySelector<HTMLElement>('.preloader__edge');
      if (sheet && edge) {
        timeline.call(enter, undefined, '>-0.15');
        timeline.add(turnAway({ sheet, edge }), '<');
      } else {
        timeline.call(enter);
      }

      void ready.then(() => {
        isReady = true;
        if (alive && timeline.paused()) timeline.resume();
      });
    }, root);

    return () => {
      alive = false;
      ctx.revert();
      unlockScroll();
    };
  }, [enter]);

  if (!active) return null;

  return (
    <div className="preloader" ref={rootRef} role="status" aria-label="Loading">
      <div className="preloader__sheet">
        <LoaderScreen progress={progress} />
      </div>
      <div className="preloader__edge" aria-hidden="true" />
    </div>
  );
}
