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
    if (!el || !entered) return;
    if (prefersReducedMotion()) return;

    const ctx = gsap.context(() => {
      gsap
        .timeline({ delay: 0.15 })
        .from('.hero__eyebrow > *', {
          y: 20,
          opacity: 0,
          duration: 0.8,
          stagger: 0.08,
          ease: 'power3.out',
        })
        .from(
          '.hero__sub',
          { y: 26, opacity: 0, duration: 0.9, ease: 'power3.out' },
          0.65,
        )
        .from(
          '.hero__badge',
          { y: 18, opacity: 0, duration: 0.7, stagger: 0.07, ease: 'power3.out' },
          0.75,
        )
        .from('.hero__cue', { opacity: 0, duration: 0.9 }, 1);

      // Content parallaxes away faster than the field behind it.
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
            <SplitText as="span" trigger="load" stagger={0.045} delay={0.1}>
              Seventeen
            </SplitText>
          </span>
          <span className="hero__line hero__line--indent">
            <SplitText as="span" trigger="load" stagger={0.045} delay={0.28}>
              Studios
            </SplitText>
            <span className="hero__dot">.</span>
          </span>
        </h1>

        <div className="hero__foot">
          <p className="hero__sub">
            We build software, interfaces and AI systems for teams whose ambition
            has outgrown their tooling. Senior hands only, capped at five people,
            and honest about being new.
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
