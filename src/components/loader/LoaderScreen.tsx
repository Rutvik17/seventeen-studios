'use client';

/**
 * The loader, wherever a loader is needed: the first-visit preloader and the
 * page-turn curtain.
 *
 * Seventeen's studio is sketched and painted as the page gets ready — pencil
 * first, then the washes, the maples turning orange and letting their leaves
 * go — with the studio's name written under it in the captions' hand and the
 * count in the corner. The count is real: it is how far the page has got.
 */

import { StudioCanvas } from './StudioCanvas';

export function LoaderScreen({ progress }: { progress: number }) {
  const shown = Math.round(Math.max(0, Math.min(100, progress)));

  return (
    <div className="loader">
      <figure className="loader__figure">
        <StudioCanvas progress={progress} className="loader__painting" />
        <figcaption className="loader__name">seventeen</figcaption>
      </figure>
      {/* Three digits, always, so the corner holds still as it passes 10 and 100. */}
      <span className="loader__count">{String(shown).padStart(3, '0')}</span>
    </div>
  );
}
