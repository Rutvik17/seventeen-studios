'use client';

/**
 * The workshop.
 *
 * Replaces the old "Who we are" manifesto, which said the studio was small and
 * senior in the same abstract register every competitor uses. This says the same
 * thing in numbers a buyer can hold — one engagement, senior only, week one,
 * published reasoning — and then explains what the constraint costs them, which
 * is the half nobody writes.
 */

import { useRef } from 'react';
import { gsap, prefersReducedMotion } from '@/lib/gsap';
import { useIsomorphicLayoutEffect } from '@/hooks/useIsomorphicLayoutEffect';
import { craft } from '@/content/studio';
import { SectionHeader } from '@/components/SectionHeader';
import { Reveal } from '@/components/motion/Reveal';
import { SplitText } from '@/components/motion/SplitText';

export function Craft() {
  const ref = useRef<HTMLElement>(null);

  useIsomorphicLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (prefersReducedMotion()) return;

    const ctx = gsap.context(() => {
      // The rule under each mark draws itself as the row arrives. A border that
      // is simply there is furniture; one that is drawn reads as something
      // being measured out.
      gsap.from('[data-mark-rule]', {
        scaleX: 0,
        transformOrigin: 'left center',
        stagger: 0.08,
        duration: 0.9,
        ease: 'power3.out',
        scrollTrigger: { trigger: '[data-marks]', start: 'top 82%' },
      });
    }, el);

    return () => ctx.revert();
  }, []);

  return (
    <section className="section craft" id="craft" ref={ref}>
      <SectionHeader
        index="01"
        label={craft.label}
        title={<p className="section-header__lead">{craft.lead}</p>}
      />

      <div className="craft__body">
        {craft.body.map((paragraph, i) => (
          <Reveal key={i} delay={i * 0.06}>
            <p className="craft__para">{paragraph}</p>
          </Reveal>
        ))}
      </div>

      <div className="craft__marks" data-marks>
        {craft.marks.map((mark) => (
          <div className="craft__mark" key={mark.label}>
            <span className="craft__mark-rule" data-mark-rule aria-hidden="true" />
            <SplitText as="span" className="craft__mark-value" stagger={0.03}>
              {mark.value}
            </SplitText>
            <span className="mono-label craft__mark-label">{mark.label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
