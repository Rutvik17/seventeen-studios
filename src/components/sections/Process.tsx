'use client';

/**
 * Process, as a stack of sticky cards.
 *
 * Each step sticks to the top and the next one slides over it, so the sequence
 * is experienced as a sequence rather than read as a list. The trailing cards
 * scale down slightly to sell the depth.
 */

import { useRef } from 'react';
import { gsap, prefersReducedMotion } from '@/lib/gsap';
import { useIsomorphicLayoutEffect } from '@/hooks/useIsomorphicLayoutEffect';
import { process } from '@/content/studio';
import { SectionHeader } from '@/components/SectionHeader';

export function Process() {
  const ref = useRef<HTMLElement>(null);

  useIsomorphicLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (prefersReducedMotion()) return;

    const ctx = gsap.context(() => {
      const cards = gsap.utils.toArray<HTMLElement>('.step');
      cards.forEach((card, index) => {
        if (index === cards.length - 1) return;
        const trigger = {
          trigger: cards[index + 1],
          start: 'top 78%',
          end: 'top 22%',
          scrub: 0.6,
        };
        // Scale + a solid veil rather than opacity: a translucent card would
        // let the one underneath show through and turn the stack to mush.
        gsap.to(card, { scale: 0.945, ease: 'none', scrollTrigger: trigger });
        gsap.to(card.querySelector('.step__veil'), {
          opacity: 0.66,
          ease: 'none',
          scrollTrigger: trigger,
        });
      });
    }, el);

    return () => ctx.revert();
  }, []);

  return (
    <section className="section process" id="process" ref={ref}>
      <SectionHeader
        index="07"
        label="How we work"
        title={
          <p className="section-header__lead">
            Four phases. The riskiest assumption gets built in week two, not
            month four — and the engagement is designed to end.
          </p>
        }
      />

      <div className="process__stack">
        {process.map((step) => (
          <article className="step" key={step.index}>
            <span className="step__veil" aria-hidden="true" />
            <div className="step__head">
              <span className="mono-label step__index">{step.index}</span>
              <h3 className="step__title">{step.title}</h3>
              <span className="mono-label step__duration">{step.duration}</span>
            </div>
            <p className="step__body">{step.description}</p>
            <ul className="step__outputs">
              {step.outputs.map((output) => (
                <li key={output}>
                  <span className="tag">{output}</span>
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </section>
  );
}
