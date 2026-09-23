'use client';

/**
 * The top edge of the sketchbook.
 *
 * On the left, the 17 mark in pencil — outlined and hatched, the same drawing
 * the loader makes — which goes back to the contents. On the right, three
 * index tabs in handwriting: Notebook, Grasp, Founder. The current tab is
 * underlined in crimson by hand; the others draw their underline when pointed
 * at.
 *
 * It replaced a bar with five routes, a live clock and an "Index" button that
 * opened a full-screen overlay. The book now has three sections, and three
 * words fit on every screen, so the overlay went too.
 */

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { gsap, prefersReducedMotion } from '@/lib/gsap';
import { useIsomorphicLayoutEffect } from '@/hooks/useIsomorphicLayoutEffect';
import { nav } from '@/content/studio';
import { LOGO_ONE, LOGO_SEVEN, LOGO_VIEWBOX } from '@/components/Logo';
import { useUi } from '@/lib/store';
import { TransitionLink } from './Transition';

/** A hand-drawn underline: one stroke that wanders slightly, with a flick at the end. */
const UNDERLINE = 'M2 6 C 18 3, 34 7, 52 5 S 84 3, 98 6 L 94 9';

export function Nav() {
  const pathname = usePathname();
  const entered = useUi((state) => state.entered);
  const ref = useRef<HTMLElement>(null);

  // Entrance, gated on the preloader handing over. The hidden state is set on
  // mount rather than when the gate opens — otherwise the bar paints in place
  // first and then jumps back up to animate in.
  useIsomorphicLayoutEffect(() => {
    const el = ref.current;
    if (!el || prefersReducedMotion()) return;
    const ctx = gsap.context(() => {
      gsap.set(el, { y: -30, opacity: 0 });
      if (!entered) return;
      gsap.to(el, { y: 0, opacity: 1, duration: 0.9, ease: 'power3.out' });
    }, el);
    return () => ctx.revert();
  }, [entered]);

  // Tucks away while reading down a page, comes back on the way up.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let last = 0;
    let hidden = false;
    const onScroll = () => {
      const y = window.scrollY;
      el.classList.toggle('is-scrolled', y > 40);
      const hide = y > last && y > 220;
      if (hide !== hidden) {
        hidden = hide;
        gsap.to(el, { yPercent: hidden ? -140 : 0, duration: 0.5, ease: 'power3.out' });
      }
      last = y;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, [pathname]);

  return (
    <header className="nav" ref={ref}>
      <TransitionLink href="/" className="nav__mark" aria-label="Seventeen Studios — contents" data-cursor="Contents">
        <svg viewBox={LOGO_VIEWBOX} className="nav__logo" aria-hidden="true" overflow="visible">
          <defs>
            <pattern id="nav-hatch" width="1.4" height="1.4" patternUnits="userSpaceOnUse" patternTransform="rotate(40)">
              <line x1="0" y1="0" x2="0" y2="1.4" stroke="currentColor" strokeWidth="0.5" />
            </pattern>
          </defs>
          {[LOGO_ONE, LOGO_SEVEN].map((d) => (
            <g key={d}>
              <path d={d} fill="url(#nav-hatch)" opacity="0.7" />
              <path d={d} fill="none" stroke="currentColor" strokeWidth="0.9" strokeLinejoin="round" />
            </g>
          ))}
        </svg>
      </TransitionLink>

      <nav className="nav__tabs" aria-label="Sections">
        {nav.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <TransitionLink
              key={item.href}
              href={item.href}
              className={`nav__tab${active ? ' is-active' : ''}`}
              aria-current={active ? 'page' : undefined}
            >
              <span>{item.label}</span>
              <svg className="nav__underline" viewBox="0 0 100 10" preserveAspectRatio="none" aria-hidden="true">
                <path d={UNDERLINE} pathLength={1} />
              </svg>
            </TransitionLink>
          );
        })}
      </nav>
    </header>
  );
}
