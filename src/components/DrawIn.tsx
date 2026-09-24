'use client';

/**
 * A little drawing in pencil or crayon — an underline, an arrow — that draws
 * itself in once the page is uncovered, stroke by stroke.
 *
 * Its paths are drawn from the start; only the script hides them, just before
 * drawing them in (CLAUDE.md rule 4), so without it, or with reduced motion,
 * the drawing is simply there. Each path wants `pathLength={1}`.
 */

import { useEffect, useRef, type ReactNode } from 'react';
import { prefersReducedMotion } from '@/lib/gsap';
import { useUi } from '@/lib/store';

export function DrawIn({
  className,
  viewBox,
  delay = 0,
  children,
}: {
  className?: string;
  viewBox: string;
  /** Seconds to wait after the page is uncovered. */
  delay?: number;
  children: ReactNode;
}) {
  const ref = useRef<SVGSVGElement>(null);
  const entered = useUi((s) => s.entered);
  const still = useRef(false);

  // Armed hidden by the script, before the page is uncovered.
  useEffect(() => {
    const svg = ref.current;
    still.current = prefersReducedMotion();
    if (!svg || still.current) return;
    const paths = Array.from(svg.querySelectorAll('path'));
    paths.forEach((p) => {
      p.style.strokeDasharray = '1';
      p.style.strokeDashoffset = '1';
    });
    return () =>
      paths.forEach((p) => {
        p.style.strokeDasharray = '';
        p.style.strokeDashoffset = '';
      });
  }, []);

  // Drawn in once it is.
  useEffect(() => {
    const svg = ref.current;
    if (!svg || !entered || still.current) return;
    const paths = Array.from(svg.querySelectorAll('path'));
    const drawing = paths.map((p, i) =>
      p.animate([{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], {
        duration: 850,
        delay: (delay + 0.25 + i * 0.3) * 1000,
        easing: 'cubic-bezier(0.76, 0, 0.24, 1)',
        fill: 'forwards',
      }),
    );
    drawing.forEach((a, i) =>
      a.finished
        .then(() => {
          paths[i].style.strokeDashoffset = '0';
        })
        .catch(() => undefined),
    );
    return () => drawing.forEach((a) => a.cancel());
  }, [entered, delay]);

  return (
    <svg ref={ref} className={className} viewBox={viewBox} aria-hidden="true" preserveAspectRatio="none">
      {children}
    </svg>
  );
}
