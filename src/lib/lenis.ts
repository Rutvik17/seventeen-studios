/**
 * Lenis smooth-scroll singleton.
 *
 * The Lenis instance is created once (client-only) and exposed through a
 * getter/setter pair so modal logic can call `.stop()` / `.start()` without
 * owning a direct reference.
 */

import type Lenis from 'lenis';

let lenisInstance: Lenis | null = null;

export function setLenis(instance: Lenis | null): void {
  lenisInstance = instance;
}

export function getLenis(): Lenis | null {
  return lenisInstance;
}
