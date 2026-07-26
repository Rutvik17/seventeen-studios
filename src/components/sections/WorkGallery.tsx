'use client';

/**
 * Pinned horizontal gallery.
 *
 * The section pins for the width of its track and converts vertical scroll
 * into horizontal travel. Distances are computed from measured widths and
 * recomputed on refresh (`invalidateOnRefresh`), because the cards are sized
 * in viewport units and the fonts land after first paint.
 *
 * Below the pin breakpoint it degrades to a normal horizontal scroller with
 * snap points — a pinned section on a phone fights the browser chrome and
 * loses.
 */

import { useRef } from 'react';
import { gsap, prefersReducedMotion } from '@/lib/gsap';
import { useIsomorphicLayoutEffect } from '@/hooks/useIsomorphicLayoutEffect';
import { concepts } from '@/content/work';
import { WorkCard } from '@/components/WorkCard';
import { SectionHeader } from '@/components/SectionHeader';
import { TransitionLink } from '@/components/Transition';

const PIN_BREAKPOINT = 860;

export function WorkGallery() {
  const sectionRef = useRef<HTMLElement>(null);

  useIsomorphicLayoutEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    if (prefersReducedMotion()) return;

    const ctx = gsap.context(() => {
      const media = gsap.matchMedia();

      media.add(`(min-width: ${PIN_BREAKPOINT}px)`, () => {
        const track = section.querySelector<HTMLElement>('.work__track');
        const viewport = section.querySelector<HTMLElement>('.work__viewport');
        const fill = section.querySelector<HTMLElement>('.work__rail-fill');
        if (!track || !viewport) return;

        const distance = () =>
          Math.max(0, track.scrollWidth - window.innerWidth + 80);

        const tween = gsap.to(track, {
          x: () => -distance(),
          ease: 'none',
          scrollTrigger: {
            trigger: viewport,
            start: 'top top',
            end: () => `+=${distance() + window.innerHeight * 0.4}`,
            scrub: 1,
            pin: true,
            anticipatePin: 1,
            invalidateOnRefresh: true,
            onUpdate: (self) => {
              if (fill) fill.style.transform = `scaleX(${self.progress})`;
            },
          },
        });

        return () => {
          tween.scrollTrigger?.kill();
          tween.kill();
        };
      });
    }, section);

    return () => ctx.revert();
  }, []);

  return (
    <section className="section work" id="work" ref={sectionRef}>
      <SectionHeader
        index="04"
        label="Concept briefs"
        title={
          <p className="section-header__lead">
            Self-initiated engagements, worked end to end. Not delivered client
            work — the studio is new, and these are how we show what we would
            actually do.
          </p>
        }
        action={
          <TransitionLink href="/work/" className="link-arrow" data-cursor="View all">
            All five briefs <i aria-hidden="true">→</i>
          </TransitionLink>
        }
      />

      <div className="work__viewport">
        <div className="work__track">
          {concepts.map((concept) => (
            <WorkCard concept={concept} key={concept.slug} />
          ))}

          <div className="work__end">
            <p className="work__end-text">
              Each brief carries its own architecture, sequencing, projected
              numbers and risk register.
            </p>
            <TransitionLink
              href="/work/"
              className="button button--ghost"
              data-cursor="Open index"
            >
              Open the index
            </TransitionLink>
          </div>
        </div>

        <div className="work__rail" aria-hidden="true">
          <span className="work__rail-fill" />
        </div>
      </div>
    </section>
  );
}
