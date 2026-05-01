'use client';

/**
 * Mounts Lenis smooth-scroll + registers GSAP ScrollTrigger once, at the
 * layout level. Any child can stop/start the scroll via `getLenis()` —
 * the modal system uses that to lock the page while a modal is open.
 *
 * Must be the very top of the component tree so ScrollTrigger instances
 * created by child effects can hook into Lenis's frame loop.
 *
 * Lenis is created in a stopped state and only resumed once the
 * pre-loader signals ready. This prevents wheel/touch input from
 * scrolling underneath the loader curtains during the preload window
 * (Loader-level `body.overflow:hidden` covers keyboard-arrow scrolls
 * too, so the two together fully lock the page).
 */

import { useEffect, type ReactNode } from 'react';
import Lenis from 'lenis';
import gsap from 'gsap';
import ScrollTrigger from 'gsap/ScrollTrigger';
import { setLenis, getLenis } from '@/lib/lenis';
import { useLoaderStore } from '@/lib/loader-store';

// Register the plugin once at module scope so ScrollTrigger is available
// everywhere — no-op on the server because GSAP plugins are tree-shaken.
if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

export function SmoothScrollProvider({ children }: { children: ReactNode }) {
  const ready = useLoaderStore((s) => s.ready);

  useEffect(() => {
    const lenis = new Lenis({
      lerp: 0.08,
      smoothWheel: true,
    });
    setLenis(lenis);

    // Start stopped — the loader owns resumption timing.
    lenis.stop();

    const raf = (time: number) => {
      lenis.raf(time * 1000);
    };
    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(0);

    // Keep ScrollTrigger in sync with Lenis's scroll updates.
    lenis.on('scroll', ScrollTrigger.update);

    return () => {
      gsap.ticker.remove(raf);
      lenis.destroy();
      setLenis(null);
    };
  }, []);

  // Resume scroll the moment the loader finishes.
  useEffect(() => {
    if (!ready) return;
    getLenis()?.start();
  }, [ready]);

  return <>{children}</>;
}
