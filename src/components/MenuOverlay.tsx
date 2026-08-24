'use client';

/**
 * Full-screen index.
 *
 * Every route in one place, so a visitor two clicks deep can reach anything
 * without going back. Opening locks scroll; Escape and route changes close it.
 */

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { gsap, prefersReducedMotion } from '@/lib/gsap';
import { useIsomorphicLayoutEffect } from '@/hooks/useIsomorphicLayoutEffect';
import { lockScroll, unlockScroll } from '@/lib/lenis';
import { useUi } from '@/lib/store';
import { nav, site } from '@/content/studio';
import { TransitionLink } from './Transition';
import { ContactLink } from '@/components/ContactLink';

export function MenuOverlay() {
  const open = useUi((state) => state.menuOpen);
  const setOpen = useUi((state) => state.setMenuOpen);
  const pathname = usePathname();
  const ref = useRef<HTMLDivElement>(null);

  // Close on route change — the link that navigated is inside the overlay.
  useEffect(() => {
    setOpen(false);
  }, [pathname, setOpen]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, setOpen]);

  /*
    THE CLOSE ANIMATION EXISTED AND NOBODY EVER SAW IT.

    The open and close timelines used to be built inside a `gsap.context` whose
    cleanup ran on every change of `open` — so closing did this, in order:

      1. cleanup of the previous run calls `ctx.revert()`, which undoes the OPEN
         tween and restores the CSS `translateY(-100%)` and `visibility: hidden`
      2. the close timeline then animates panels that are already off-screen and
         already invisible

    Measured: the panel jumped from y=0 to y=-900 with visibility hidden in the
    first frame, and the 0.55s slide played out from -895 to +698 where nobody
    could see it. It read as an instant close with a beautiful open.

    So the context is created ONCE here and reverted only on unmount, per the
    animation rules. The timelines below are added into it and are never
    reverted between states — the close is allowed to run on visible elements.
  */
  const ctx = useRef<gsap.Context | null>(null);
  const timeline = useRef<gsap.core.Timeline | null>(null);

  useIsomorphicLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    ctx.current = gsap.context(() => {}, el);
    return () => {
      timeline.current?.kill();
      timeline.current = null;
      ctx.current?.revert();
      ctx.current = null;
    };
  }, []);

  useIsomorphicLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (prefersReducedMotion()) {
      gsap.set(el, { autoAlpha: open ? 1 : 0 });
      if (open) lockScroll();
      else unlockScroll();
      return;
    }

    const panels = el.querySelectorAll('.menu__panel');
    const primary = el.querySelectorAll('.menu__primary-item');
    // The foot: the address, the social row and the location line. There was
    // a `.menu__list-item` in this selector too, left from a secondary link
    // list this overlay no longer renders — it matched nothing.
    const secondary = el.querySelectorAll('.menu__foot > *');

    // A fast double-toggle must not leave two timelines fighting over the same
    // transforms; the previous one is killed, not reverted.
    timeline.current?.kill();

    ctx.current?.add(() => {
      if (open) {
        lockScroll();
        gsap.set(el, { pointerEvents: 'auto', visibility: 'visible' });
        timeline.current = gsap
          .timeline()
          // `y: 0` is not redundant: the panels carry a CSS
          // `translateY(-100%)` for the no-JS case, which GSAP resolves into a
          // pixel `y` offset that would otherwise stack with `yPercent`.
          .fromTo(
            panels,
            { yPercent: -100, y: 0 },
            { yPercent: 0, duration: 0.62, ease: 'power4.inOut', stagger: 0.05 },
          )
          // `y: 0` clears the -16px the close tween leaves behind. yPercent
          // and y are separate transform channels, so animating yPercent back
          // to 0 does not undo it — the items stayed shifted up and their
          // ascenders were sliced off by the reveal mask.
          .fromTo(
            primary,
            { yPercent: 130, y: 0, opacity: 0 },
            {
              yPercent: 0,
              opacity: 1,
              duration: 0.85,
              ease: 'power4.out',
              stagger: 0.06,
            },
            '-=0.28',
          )
          .fromTo(
            secondary,
            { y: 22, opacity: 0 },
            { y: 0, opacity: 1, duration: 0.6, ease: 'power3.out', stagger: 0.03 },
            '-=0.6',
          );
      } else {
        timeline.current = gsap
          .timeline({
            onComplete: () => {
              gsap.set(el, { pointerEvents: 'none', visibility: 'hidden' });
              unlockScroll();
            },
          })
          .to([primary, secondary], {
            opacity: 0,
            y: -16,
            duration: 0.24,
            ease: 'power2.in',
            stagger: 0.01,
          })
          .to(
            panels,
            { yPercent: 100, y: 0, duration: 0.55, ease: 'power4.inOut', stagger: 0.04 },
            '-=0.1',
          );
      }
    });
  }, [open]);

  return (
    /*
      `data-open` exists for CSS, not for this component.

      The header sits ABOVE this overlay (z-index 500 against 480) so its close
      control stays reachable, and on Grasp's two pages the header is inverted to
      chalk for the slate ground under it. Open the menu there and that chalk
      lands on this overlay's near-white panels: the links and the mark are still
      there, still clickable, and completely invisible.

      The inversion is keyed off `:has([data-slate])`, so it needs something to
      key OFF. This is it — see the rule in `globals.css`.
    */
    <div
      className="menu"
      id="site-index"
      ref={ref}
      aria-hidden={!open}
      data-open={open ? '' : undefined}
    >
      <div className="menu__panels" aria-hidden="true">
        {Array.from({ length: 4 }).map((_, index) => (
          <div className="menu__panel" key={index} />
        ))}
      </div>

      {/*
        `data-lenis-prevent` is what makes this scrollable on touch: Lenis is
        stopped while the overlay is open and swallows touchmove, so without
        this the panel cannot be scrolled by finger even though the container
        overflows.
      */}
      <div className="menu__inner" data-lenis-prevent>
        <div className="menu__primary">
          <span className="mono-label menu__caption">Navigate</span>
          <ul>
            <li>
              <TransitionLink href="/" className="menu__primary-link">
                <span className="menu__primary-item">Home</span>
              </TransitionLink>
            </li>
            {nav.map((item) => (
              <li key={item.href}>
                <TransitionLink href={item.href} className="menu__primary-link">
                  <span className="menu__primary-item">{item.label}</span>
                </TransitionLink>
              </li>
            ))}
          </ul>
        </div>

        <div className="menu__foot">
          <ContactLink className="menu__email" />
          <div className="menu__social">
            {site.social.map((item) =>
              'contact' in item ? (
                <ContactLink key={item.label} className="mono-label">
                  {item.label}
                </ContactLink>
              ) : (
                <a
                  key={item.label}
                  href={item.href}
                  target={item.href.startsWith('http') ? '_blank' : undefined}
                  rel="noreferrer noopener"
                  className="mono-label"
                >
                  {item.label}
                </a>
              ),
            )}
          </div>
          <span className="mono-label">{site.location}</span>
        </div>
      </div>
    </div>
  );
}
