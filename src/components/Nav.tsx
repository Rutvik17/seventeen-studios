'use client';

/**
 * The top edge of the sketchbook.
 *
 * On the left, the mark — an autumn maple leaf, sketched and painted — which
 * goes back to the film. On the right, three
 * index tabs, written in the same hand as the film's captions: Caveat, heavy,
 * in the ink of the page. The current tab is underlined with the same straight
 * pen line the captions carry; the others write theirs in when pointed at.
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
import { LeafMark } from '@/components/LeafMark';
import { useUi } from '@/lib/store';
import { TransitionLink } from './Transition';

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
      <TransitionLink href="/" className="nav__mark" aria-label="Seventeen Studios — home" data-cursor="Home">
        <LeafMark className="nav__logo" />
      </TransitionLink>

      <nav className="nav__tabs" aria-label="Sections">
        {nav.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <TransitionLink
              key={item.href}
              href={item.href}
              className={`nav__tab${active ? ' is-active' : ''}`}
              data-row
              aria-current={active ? 'page' : undefined}
            >
              {item.label}
            </TransitionLink>
          );
        })}
      </nav>
    </header>
  );
}
