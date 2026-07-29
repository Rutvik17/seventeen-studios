'use client';

/**
 * Type that fills its container's width exactly.
 *
 * A `vw`-based clamp is a guess: it assumes an average glyph advance, and the
 * moment the string or the typeface changes the line either overflows or
 * leaves a gap. This measures the rendered text at a reference size and solves
 * for the size that fits, so the wordmark spans the viewport edge to edge on
 * any screen — the full-bleed treatment Mozilla and Robinhood use.
 *
 * Re-fits on container resize and again once webfonts have loaded, since the
 * fallback face measures differently.
 */

import { useRef, type ReactNode } from 'react';
import { useIsomorphicLayoutEffect } from '@/hooks/useIsomorphicLayoutEffect';

const REFERENCE_PX = 100;

export function FitText({
  children,
  className,
  /** Fraction of the container width to occupy. */
  fill = 1,
  /** Never exceed this, so a short string does not become absurd. */
  maxPx = 420,
}: {
  children: ReactNode;
  className?: string;
  fill?: number;
  maxPx?: number;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);

  useIsomorphicLayoutEffect(() => {
    const wrap = wrapRef.current;
    const text = textRef.current;
    if (!wrap || !text) return;

    const fit = () => {
      const available = wrap.clientWidth;
      if (!available) return;

      // Measure at a known size, then scale linearly. Text advance is linear
      // in font-size, so one measurement is enough.
      //
      // The measurement happens on a throwaway clone, not on the live element.
      // The reduced-motion block in globals.css sets `transition-duration` on
      // `*`, and `transition-property` defaults to `all` — so font-size became
      // a transitioned property, and setting the reference size then reading
      // the width straight back returned a value part-way through the tween
      // (suppressing `transition` inline does not cancel one already running).
      // The fit converged on sqrt(available x natural), the geometric mean, and
      // the wordmark overflowed its container by up to 257px for every
      // reduced-motion visitor. A node that has just been inserted has no
      // running transition, so the reference size applies immediately.
      const probe = text.cloneNode(true) as HTMLElement;
      probe.setAttribute('aria-hidden', 'true');
      probe.style.setProperty('transition', 'none', 'important');
      probe.style.position = 'absolute';
      probe.style.visibility = 'hidden';
      probe.style.pointerEvents = 'none';
      probe.style.whiteSpace = 'nowrap';
      probe.style.width = 'auto';
      probe.style.maxWidth = 'none';
      probe.style.fontSize = `${REFERENCE_PX}px`;
      // Absolutely positioned, so it is out of flow and cannot resize `wrap`
      // and re-trigger the observer below.
      wrap.appendChild(probe);
      const natural = probe.getBoundingClientRect().width;
      wrap.removeChild(probe);
      if (!natural) return;

      const size = (REFERENCE_PX * available * fill) / natural;
      text.style.fontSize = `${Math.min(size, maxPx)}px`;
    };

    fit();

    const observer = new ResizeObserver(fit);
    observer.observe(wrap);

    // Webfonts land after first paint and change every advance width.
    let cancelled = false;
    document.fonts?.ready
      .then(() => {
        if (!cancelled) fit();
      })
      .catch(() => {
        /* Font loading API unavailable — the measured fit still applies. */
      });

    return () => {
      cancelled = true;
      observer.disconnect();
    };
  }, [children, fill, maxPx]);

  return (
    <div className={`fit-text ${className ?? ''}`.trim()} ref={wrapRef}>
      <span className="fit-text__inner" ref={textRef}>
        {children}
      </span>
    </div>
  );
}
