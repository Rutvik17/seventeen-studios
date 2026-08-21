'use client';

/**
 * Pinned horizontal gallery.
 *
 * The section pins for the width of its track and converts vertical scroll
 * into horizontal travel. Distances are computed from measured widths and
 * recomputed on refresh (`invalidateOnRefresh`), because the cards are sized
 * in viewport units and the fonts land after first paint.
 *
 * Three things lift it above a plain scrub:
 *
 *  - **Drag.** Pointer drags are translated into scroll position rather than
 *    into a second transform, so dragging and scrolling drive the same
 *    timeline and can never disagree about where the track is.
 *  - **Inertia.** Releasing a drag throws the track on, decaying toward rest.
 *  - **Lean.** Cards skew and rotate with the travel velocity and settle when
 *    it stops, which is what makes the row feel like it has mass.
 *
 * Below the pin breakpoint it degrades to a native horizontal scroller with
 * snap points — a pinned section on a phone fights the browser chrome and
 * loses.
 */

import { useRef } from 'react';
import { gsap, prefersReducedMotion } from '@/lib/gsap';
import { useIsomorphicLayoutEffect } from '@/hooks/useIsomorphicLayoutEffect';
import { getLenis } from '@/lib/lenis';
import { concepts } from '@/content/work';
import { spell } from '@/lib/time';
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

        // Lean is applied to the card, not to `.work-card__tilt` — the tilt
        // hook owns that element's rotation and the two would fight.
        const cards = gsap.utils.toArray<HTMLElement>('.work-card', section);
        const leanSetters = cards.map((el) => ({
          skew: gsap.quickSetter(el, 'skewX', 'deg'),
          rotate: gsap.quickSetter(el, 'rotationY', 'deg'),
        }));

        const distance = () =>
          Math.max(0, track.scrollWidth - window.innerWidth + 80);

        let lastX = 0;
        let lean = 0;

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

              // Lean is derived from the track's own frame-to-frame travel, so
              // it responds identically to wheel, keyboard and drag input.
              const x = gsap.getProperty(track, 'x') as number;
              const delta = x - lastX;
              lastX = x;
              lean += (delta * 0.06 - lean) * 0.28;
              const clamped = gsap.utils.clamp(-7, 7, lean);
              leanSetters.forEach(({ skew, rotate }) => {
                skew(clamped);
                rotate(clamped * 0.7);
              });
            },
          },
        });

        // --- Drag to explore --------------------------------------------
        const lenis = getLenis();
        let dragging = false;
        let startX = 0;
        let startScroll = 0;
        let lastPointerX = 0;
        let pointerVelocity = 0;
        let captured = false;
        let throwTween: gsap.core.Tween | null = null;

        // Below this, the gesture is still a click.
        const DRAG_THRESHOLD = 6;

        const scrollTo = (value: number) => {
          if (lenis) lenis.scrollTo(value, { immediate: true });
          else window.scrollTo(0, value);
        };

        const onDown = (event: PointerEvent) => {
          if (event.button !== 0) return;
          dragging = true;
          startX = event.clientX;
          lastPointerX = event.clientX;
          pointerVelocity = 0;
          startScroll = window.scrollY;
          captured = false;
          throwTween?.kill();
        };

        const onMove = (event: PointerEvent) => {
          if (!dragging) return;
          pointerVelocity = event.clientX - lastPointerX;
          lastPointerX = event.clientX;

          // Capture only once the gesture has committed to being a drag.
          // Capturing on pointerdown retargets the subsequent click event to
          // the capturing element, which silently breaks every card link.
          if (!captured && Math.abs(event.clientX - startX) > DRAG_THRESHOLD) {
            captured = true;
            viewport.classList.add('is-dragging');
            viewport.setPointerCapture(event.pointerId);
          }
          if (!captured) return;

          // Dragging left should advance the track, so the scroll delta is
          // the inverse of the pointer delta.
          scrollTo(startScroll - (event.clientX - startX) * 1.25);
        };

        const onUp = (event: PointerEvent) => {
          if (!dragging) return;
          dragging = false;
          viewport.classList.remove('is-dragging');
          if (viewport.hasPointerCapture(event.pointerId)) {
            viewport.releasePointerCapture(event.pointerId);
          }
          // A tap never became a drag: leave the click alone.
          if (!captured) return;

          // A flick keeps going and decays, the way a physical rail would.
          const momentum = gsap.utils.clamp(-900, 900, -pointerVelocity * 26);
          if (Math.abs(momentum) < 24) return;
          const target = window.scrollY + momentum;
          const proxy = { value: window.scrollY };
          throwTween = gsap.to(proxy, {
            value: target,
            duration: 1.1,
            ease: 'power3.out',
            onUpdate: () => scrollTo(proxy.value),
          });
        };

        // A drag that travelled more than a few pixels must not also fire the
        // card's link on release.
        const onClickCapture = (event: MouseEvent) => {
          if (Math.abs(lastPointerX - startX) > DRAG_THRESHOLD) {
            event.preventDefault();
            event.stopPropagation();
          }
        };

        viewport.addEventListener('pointerdown', onDown);
        viewport.addEventListener('pointermove', onMove);
        viewport.addEventListener('pointerup', onUp);
        viewport.addEventListener('pointercancel', onUp);
        viewport.addEventListener('click', onClickCapture, true);

        return () => {
          viewport.removeEventListener('pointerdown', onDown);
          viewport.removeEventListener('pointermove', onMove);
          viewport.removeEventListener('pointerup', onUp);
          viewport.removeEventListener('pointercancel', onUp);
          viewport.removeEventListener('click', onClickCapture, true);
          throwTween?.kill();
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
        index="06"
        label="Concept briefs"
        title={
          <p className="section-header__lead">
            Self-initiated engagements, worked end to end — the architecture,
            the sequencing, the numbers. Concept briefs, so you can audit the
            thinking before you commission any of it.
          </p>
        }
        action={
          <TransitionLink href="/work/" className="link-arrow" data-cursor="View all">
            All {spell(concepts.length)} briefs <i aria-hidden="true">→</i>
          </TransitionLink>
        }
      />

      <div className="work__viewport" data-cursor="Drag">
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
