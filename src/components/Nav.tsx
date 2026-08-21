'use client';

/**
 * Fixed header.
 *
 * Hides on downward scroll and returns on upward scroll. Lenis scrolls the
 * window itself, so a native scroll listener tracks the smooth position
 * correctly and keeps working when smooth scrolling is disabled.
 */

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { gsap, prefersReducedMotion } from '@/lib/gsap';
import { useIsomorphicLayoutEffect } from '@/hooks/useIsomorphicLayoutEffect';
import { nav, site } from '@/content/studio';
import { useUi } from '@/lib/store';
import { TransitionLink } from './Transition';
import { Scramble } from './motion/Scramble';
import { Magnetic } from './motion/Magnetic';

function LocalTime() {
  const [time, setTime] = useState<string>('');

  useEffect(() => {
    const tick = () => {
      setTime(
        new Intl.DateTimeFormat('en-GB', {
          hour: '2-digit',
          minute: '2-digit',
          timeZone: site.timezone,
          hour12: false,
        }).format(new Date()),
      );
    };
    tick();
    const id = window.setInterval(tick, 15000);
    return () => window.clearInterval(id);
  }, []);

  // Rendered empty on the server: a timestamp would hydrate mismatched.
  return (
    <span className="nav__time mono-label" suppressHydrationWarning>
      {time ? `${time} ${site.timezoneLabel}` : ''}
    </span>
  );
}

export function Nav() {
  const pathname = usePathname();
  const entered = useUi((state) => state.entered);
  const menuOpen = useUi((state) => state.menuOpen);
  const toggleMenu = useUi((state) => state.toggleMenu);
  const ref = useRef<HTMLElement>(null);

  // Entrance, gated on the preloader handing over. The hidden state is set on
  // mount rather than when the gate opens — otherwise the nav paints in place
  // first and then jumps back up to animate in.
  useIsomorphicLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (prefersReducedMotion()) return;
    const ctx = gsap.context(() => {
      gsap.set(el, { y: -34, opacity: 0 });
      if (!entered) return;
      gsap.to(el, { y: 0, opacity: 1, duration: 0.9, ease: 'power3.out' });
    }, el);
    return () => ctx.revert();
  }, [entered]);

  /*
    The nav is sumi ink, and the home page now opens on a dusk sky. Dark type on
    a dark sky is invisible — so where a dark hero is the first thing on the
    page, the nav inverts until it has scrolled clear of it.

    Detected from the DOM rather than from the pathname: the nav should not have
    to hold a list of which routes happen to start dark, and a `.world` element
    is the actual condition. `useIsomorphicLayoutEffect` runs after mutation and
    BEFORE paint, so the inverted state is applied in the same frame and there
    is no flash of unreadable type.

    `:has()` would express this in one CSS line and was the first attempt. It is
    ~93% supported, and the 7% that lack it get dark-on-dark — a legibility
    failure is the wrong thing to leave to progressive enhancement.
  */
  useIsomorphicLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.classList.toggle('nav--over-dark', !!document.querySelector('.world'));
  }, [pathname]);

  // Direction-aware hide/show.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let lastScroll = 0;
    let hidden = false;

    const onScroll = () => {
      const scroll = window.scrollY;
      el.classList.toggle('is-scrolled', scroll > 40);
      const goingDown = scroll > lastScroll;
      const shouldHide = goingDown && scroll > 220 && !useUi.getState().menuOpen;
      if (shouldHide !== hidden) {
        hidden = shouldHide;
        gsap.to(el, {
          yPercent: hidden ? -140 : 0,
          duration: 0.5,
          ease: 'power3.out',
        });
      }
      lastScroll = scroll;
    };

    // Lenis scrolls the window, so the native event covers both smooth and
    // reduced-motion (native) scrolling without an ordering dependency.
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, [pathname]);

  return (
    <header className="nav" ref={ref}>
      <TransitionLink href="/" className="nav__mark" aria-label="Seventeen Studios — home">
        <span className="nav__mark-text">{site.wordmark}</span>
        <span className="nav__mark-dot">.</span>
      </TransitionLink>

      <nav className="nav__links" aria-label="Primary">
        {nav.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <TransitionLink
              key={item.href}
              href={item.href}
              className={`nav__link${active ? ' is-active' : ''}`}
            >
              <Scramble text={item.label} />
            </TransitionLink>
          );
        })}
      </nav>

      <div className="nav__aside">
        <LocalTime />
        <Magnetic strength={0.2}>
          <button
            type="button"
            className={`nav__index${menuOpen ? ' is-open' : ''}`}
            onClick={toggleMenu}
            aria-expanded={menuOpen}
            aria-controls="site-index"
            data-cursor={menuOpen ? 'Close' : 'Index'}
          >
            <span className="nav__index-label">{menuOpen ? 'Close' : 'Index'}</span>
            <span className="nav__index-bars" aria-hidden="true">
              <i />
              <i />
            </span>
          </button>
        </Magnetic>
      </div>
    </header>
  );
}
