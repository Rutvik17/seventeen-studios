'use client';

/**
 * Client-side foundation, mounted once in the root layout.
 *
 * - Creates the Lenis instance and drives it from the GSAP ticker so scroll
 *   and animation share a single frame loop.
 * - Keeps ScrollTrigger in sync with Lenis's virtual scroll position.
 * - Publishes scroll velocity as a CSS custom property, which the marquee and
 *   the section rail read without needing to subscribe in React.
 */

import { useEffect, type ReactNode } from 'react';
import Lenis from 'lenis';
import { usePathname } from 'next/navigation';
import { gsap, ScrollTrigger, prefersReducedMotion } from '@/lib/gsap';
import { setLenis } from '@/lib/lenis';

export function Providers({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  useEffect(() => {
    const reduced = prefersReducedMotion();

    const lenis = new Lenis({
      lerp: reduced ? 1 : 0.085,
      smoothWheel: !reduced,
      // Touch devices keep native momentum; hijacking it feels worse, not better.
      syncTouch: false,
    });
    setLenis(lenis);

    const raf = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(raf);

    const onScroll = (instance: Lenis) => {
      ScrollTrigger.update();
      document.documentElement.style.setProperty(
        '--scroll-velocity',
        Math.max(-3, Math.min(3, instance.velocity / 12)).toFixed(3),
      );
    };
    lenis.on('scroll', onScroll);

    return () => {
      lenis.off('scroll', onScroll);
      gsap.ticker.remove(raf);
      lenis.destroy();
      setLenis(null);
    };
  }, []);

  // A new route means new triggers and new measurements.
  useEffect(() => {
    const id = window.setTimeout(() => ScrollTrigger.refresh(), 260);
    return () => window.clearTimeout(id);
  }, [pathname]);

  return <>{children}</>;
}
