/**
 * Lenis smooth-scroll singleton.
 *
 * Held outside React so overlays (menu, preloader) can lock and release the
 * page without threading a ref through the tree.
 */

import type Lenis from 'lenis';

let instance: Lenis | null = null;

type Listener = (lenis: Lenis) => void;
const listeners = new Set<Listener>();

export function setLenis(next: Lenis | null): void {
  instance = next;
  if (next) listeners.forEach((listener) => listener(next));
}

export function getLenis(): Lenis | null {
  return instance;
}

/**
 * Run `listener` as soon as Lenis exists — immediately if it already does.
 *
 * React runs child effects before parent effects, so a component that reaches
 * for `getLenis()` on mount finds nothing: the provider that creates it has
 * not run yet. Subscribing removes that ordering dependency.
 *
 * Returns an unsubscribe function.
 */
export function onLenis(listener: Listener): () => void {
  listeners.add(listener);
  if (instance) listener(instance);
  return () => listeners.delete(listener);
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
