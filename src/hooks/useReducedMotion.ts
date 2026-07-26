'use client';

import { useEffect, useState } from 'react';

/**
 * Tracks `prefers-reduced-motion`, including live changes.
 *
 * Starts `false` so the server and the first client render agree; the effect
 * corrects it before any animation is allowed to start.
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(query.matches);
    const onChange = (event: MediaQueryListEvent) => setReduced(event.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  return reduced;
}
