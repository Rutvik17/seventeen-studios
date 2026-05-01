/**
 * SSR-safe replacement for `useLayoutEffect`.
 * GSAP needs layout-effect timing in the browser, but `useLayoutEffect`
 * warns in SSR — fall back to `useEffect` on the server.
 */

import { useEffect, useLayoutEffect } from 'react';

export const useIsomorphicLayoutEffect =
  typeof window !== 'undefined' ? useLayoutEffect : useEffect;
