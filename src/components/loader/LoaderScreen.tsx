'use client';

/**
 * The loader, wherever a loader is needed.
 *
 * One component, three callers: the first-visit preloader, the page-transition
 * curtain, and the founder page waiting on its model. They used to be three
 * different screens — a boot log with a progress rail on first load, a bare "17"
 * on route changes, and the filling numeral on the founder page — so the site
 * appeared to have three loading states that had nothing to do with each other.
 *
 * The numeral fills as the number climbs, and the number sits in the bottom
 * right. That is the whole design, and it is the same one every time.
 */

import { LiquidMark } from './LiquidMark';

export function LoaderScreen({ progress }: { progress: number }) {
  const shown = Math.round(Math.max(0, Math.min(100, progress)));

  return (
    <div className="loader">
      <LiquidMark progress={progress} />
      {/*
        Three digits, always. A counter that changes width as it passes 10 and
        100 twitches in the corner, and this one is the only thing on the screen
        holding still.
      */}
      <span className="loader__count mono-label">{String(shown).padStart(3, '0')}</span>
    </div>
  );
}
