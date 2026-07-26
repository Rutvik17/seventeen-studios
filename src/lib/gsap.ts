'use client';

/**
 * Single GSAP entry point.
 *
 * Plugins are registered exactly once, at module scope, guarded for SSR.
 * Every component imports `gsap` and `ScrollTrigger` from here rather than
 * from the package so registration can never be missed.
 */

import gsap from 'gsap';
import ScrollTrigger from 'gsap/dist/ScrollTrigger';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
  // Lenis drives the frame loop; lag smoothing would fight it.
  gsap.ticker.lagSmoothing(0);
}

export { gsap, ScrollTrigger };

/** True when the visitor has asked the OS to reduce motion. */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Refresh ScrollTrigger once layout has settled — fonts and generative SVGs
 * change measured heights after first paint, which invalidates pin distances.
 */
export function refreshScrollTriggers(): void {
  if (typeof window === 'undefined') return;
  requestAnimationFrame(() => ScrollTrigger.refresh());
}
