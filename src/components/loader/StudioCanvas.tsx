'use client';

/**
 * Seventeen's studio, in autumn, on a canvas — the loader's painting and the
 * header's mark (`lib/film/studio.ts` draws it).
 *
 * `progress` (0–100) moves the drawing from a blank sheet through the pencil
 * to the finished watercolour. While the painting is on screen its maples
 * keep dropping leaves, on their own clock, so the loader is never still even
 * while it waits for the page. Under reduced motion the painting is shown
 * finished and nothing falls.
 */

import { useEffect, useRef } from 'react';
import { prefersReducedMotion } from '@/lib/gsap';
import { StudioPainting, MARK_CROP, LOADER_CROP } from '@/lib/film/studio';

export function StudioCanvas({ progress = 100, mark = false, className }: { progress?: number; mark?: boolean; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const painting = useRef<StudioPainting | null>(null);
  const reduced = useRef(false);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    reduced.current = prefersReducedMotion();
    const font = getComputedStyle(document.documentElement).getPropertyValue('--font-hand').trim() || 'cursive';
    const p = new StudioPainting(canvas, { crop: mark ? MARK_CROP : LOADER_CROP, font });
    painting.current = p;
    p.setProgress(mark || reduced.current ? 1 : progress / 100);
    p.render(0, false);
    if (mark || reduced.current) {
      // Once the handwriting has arrived, write the number again in it.
      void document.fonts?.ready.then(() => p.render(0, false));
      const ro = new ResizeObserver(() => {
        p.resize();
        p.render(0, false);
      });
      ro.observe(canvas);
      return () => ro.disconnect();
    }
    let raf = 0;
    let last = performance.now();
    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      p.render(dt);
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
    // The painting is made once; progress is fed to it below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mark]);

  useEffect(() => {
    if (!mark && !reduced.current) painting.current?.setProgress(progress / 100);
  }, [progress, mark]);

  return <canvas ref={ref} className={className} aria-hidden="true" />;
}
