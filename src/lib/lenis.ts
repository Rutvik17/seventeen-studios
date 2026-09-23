/**
 * Lenis smooth-scroll singleton.
 *
 * Held outside React so the preloader can lock and release the page without
 * threading a ref through the tree.
 *
 * Don't read `getLenis()` in a child's mount effect: React runs child effects
 * before the provider's, so it is still null there. Listen for the window's
 * native `scroll` event instead — Lenis scrolls the window.
 */

import type Lenis from 'lenis';

let instance: Lenis | null = null;

export function setLenis(next: Lenis | null): void {
  instance = next;
}

export function getLenis(): Lenis | null {
  return instance;
}

/** Lock page scrolling. Safe to call before Lenis has mounted. */
export function lockScroll(): void {
  instance?.stop();
  if (typeof document !== 'undefined') {
    document.documentElement.classList.add('is-locked');
  }
}

export function unlockScroll(): void {
  instance?.start();
  if (typeof document !== 'undefined') {
    document.documentElement.classList.remove('is-locked');
  }
}
