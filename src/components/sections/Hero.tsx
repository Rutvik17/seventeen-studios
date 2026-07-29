'use client';

import { useRef } from 'react';
import { gsap, prefersReducedMotion } from '@/lib/gsap';
import { useIsomorphicLayoutEffect } from '@/hooks/useIsomorphicLayoutEffect';
import { useUi } from '@/lib/store';
import { site } from '@/content/studio';
import { Field } from '@/components/Field';
import { SplitText } from '@/components/motion/SplitText';

/**
 * Hero.
 *
 * The type is the interface: two clipped display lines that build character by
 * character once the preloader hands over, with the WebGL field behind them
 * and everything below arriving on the tail of the same timeline.
 */
export function Hero() {
  const ref = useRef<HTMLElement>(null);
  const entered = useUi((state) => state.entered);

  useIsomorphicLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (prefersReducedMotion()) return;

    const ctx = gsap.context(() => {
      // Content parallaxes away faster than the field behind it. Created
      // regardless of the gate — it is scroll-driven, not entrance-driven.
      gsap.to('.hero__inner', {
        yPercent: -14,
        opacity: 0,
        ease: 'none',
        scrollTrigger: {
          trigger: el,
          start: 'top top',
          end: 'bottom top',
          scrub: 0.6,
        },
      });

      // Start states go on immediately, so the un-animated hero never paints
      // while the loader curtain is still clearing.
      gsap.set(['.hero__eyebrow > *', '.hero__sub'], { y: 24, opacity: 0 });
      gsap.set('.hero__badge', { y: 18, opacity: 0 });
      gsap.set('.hero__cue', { opacity: 0 });

      if (!entered) return;

      gsap
        .timeline({ delay: 0.15 })
        .to('.hero__eyebrow > *', {
          y: 0,
          opacity: 1,
          duration: 0.8,
          stagger: 0.08,
          ease: 'power3.out',
        })
        .to(
          '.hero__sub',
          { y: 0, opacity: 1, duration: 0.9, ease: 'power3.out' },
          0.65,
        )
        .to(
          '.hero__badge',
          { y: 0, opacity: 1, duration: 0.7, stagger: 0.07, ease: 'power3.out' },
          0.75,
        )
        .to('.hero__cue', { opacity: 1, duration: 0.9 }, 1);
    }, el);

    return () => ctx.revert();
  }, [entered]);

  return (
    <section className="hero" ref={ref}>
      <Field />
      <span className="hero__ghost" aria-hidden="true">
        17
      </span>

      <div className="hero__inner">
        <div className="hero__eyebrow">
          <span className="mono-label">Independent engineering studio</span>
          <span className="mono-label hero__eyebrow-right">
            {site.location} · Est. {site.founded}
          </span>
        </div>

        <h1 className="hero__title">
          <span className="hero__line">
            <SplitText as="span" trigger="load" stagger={0.045} delay={0.1} depth>
              Seventeen
            </SplitText>
          </span>
          <span className="hero__line hero__line--indent">
            <SplitText as="span" trigger="load" stagger={0.045} delay={0.28} depth>
              Studios
            </SplitText>
            <span className="hero__dot">.</span>
          </span>
        </h1>

        <div className="hero__foot">
          <p className="hero__sub">
            We build software, interfaces and AI systems for teams whose ambition
            has outgrown their tooling. Senior engineers only, a bench capped at
            five, two engagements at a time.
          </p>
          <ul className="hero__badges">
            <li className="hero__badge hero__badge--live">
              <span className="hero__pulse" aria-hidden="true" />
              {site.availability}
            </li>
            <li className="hero__badge">Product</li>
            <li className="hero__badge">Creative</li>
            <li className="hero__badge">AI</li>
          </ul>
        </div>
      </div>

      <div className="hero__cue" aria-hidden="true">
        <span className="mono-label">Scroll</span>
        <span className="hero__cue-line" />
      </div>
    </section>
  );
}
