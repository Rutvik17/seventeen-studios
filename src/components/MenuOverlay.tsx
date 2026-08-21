'use client';

/**
 * Full-screen index.
 *
 * Not just a nav: it exposes the whole site — every concept brief and every
 * essay — so a visitor two clicks deep can reach anything without going back
 * to the home page. Opening locks scroll; Escape and route changes close it.
 */

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { gsap, prefersReducedMotion } from '@/lib/gsap';
import { useIsomorphicLayoutEffect } from '@/hooks/useIsomorphicLayoutEffect';
import { lockScroll, unlockScroll } from '@/lib/lenis';
import { useUi } from '@/lib/store';
import { nav, site } from '@/content/studio';
import { concepts } from '@/content/work';
import { essays } from '@/content/thinking';
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
    const secondary = el.querySelectorAll('.menu__list-item, .menu__foot > *');

    const ctx = gsap.context(() => {
      if (open) {
        lockScroll();
        gsap.set(el, { pointerEvents: 'auto', visibility: 'visible' });
        gsap
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
        gsap
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
    }, el);

    return () => ctx.revert();
  }, [open]);

  return (
    <div className="menu" id="site-index" ref={ref} aria-hidden={!open}>
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

        <div className="menu__columns">
          <div className="menu__list">
            <span className="mono-label menu__caption">Concept briefs</span>
            <ul>
              {concepts.map((concept) => (
                <li className="menu__list-item" key={concept.slug}>
                  <TransitionLink href={`/work/${concept.slug}/`}>
                    <span className="mono-label">{concept.index}</span>
                    <span>{concept.name}</span>
                    <span className="menu__list-meta">{concept.sector}</span>
                  </TransitionLink>
                </li>
              ))}
            </ul>
          </div>

          <div className="menu__list">
            <span className="mono-label menu__caption">Thinking</span>
            <ul>
              {essays.map((essay) => (
                <li className="menu__list-item" key={essay.slug}>
                  <TransitionLink href={`/thinking/${essay.slug}/`}>
                    <span className="mono-label">{essay.index}</span>
                    <span>{essay.title}</span>
                    <span className="menu__list-meta">{essay.topic}</span>
                  </TransitionLink>
                </li>
              ))}
            </ul>
          </div>
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
          <span className="mono-label">{site.availability}</span>
        </div>
      </div>
    </div>
  );
}
