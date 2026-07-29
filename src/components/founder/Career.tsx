'use client';

/**
 * Career timeline.
 *
 * A single hairline spine is drawn down the column as you scroll — scaleY
 * scrubbed against the section, with each node lighting up as the line passes
 * it. Rows arrive from the side on a stagger. The effect is that the record
 * writes itself in the order it happened.
 */

import { useRef } from 'react';
import { gsap, prefersReducedMotion } from '@/lib/gsap';
import { useIsomorphicLayoutEffect } from '@/hooks/useIsomorphicLayoutEffect';
import { career } from '@/content/founder';

export function Career() {
  const ref = useRef<HTMLDivElement>(null);

  useIsomorphicLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (prefersReducedMotion()) return;

    const ctx = gsap.context(() => {
      const spine = el.querySelector<HTMLElement>('.career__spine-fill');
      if (spine) {
        gsap.fromTo(
          spine,
          { scaleY: 0 },
          {
            scaleY: 1,
            ease: 'none',
            transformOrigin: '50% 0%',
            scrollTrigger: {
              trigger: el,
              start: 'top 62%',
              end: 'bottom 72%',
              scrub: 0.6,
            },
          },
        );
      }

      gsap.utils.toArray<HTMLElement>('.career__row', el).forEach((row) => {
        const node = row.querySelector<HTMLElement>('.career__node');

        gsap.from(row.querySelectorAll('.career__reveal'), {
          y: 34,
          opacity: 0,
          duration: 0.9,
          stagger: 0.06,
          ease: 'power3.out',
          scrollTrigger: { trigger: row, start: 'top 84%', once: true },
        });

        if (node) {
          gsap.fromTo(
            node,
            { scale: 0.4, backgroundColor: 'rgba(244,241,234,0.2)' },
            {
              scale: 1,
              backgroundColor: '#d4ff3f',
              duration: 0.5,
              ease: 'back.out(2)',
              scrollTrigger: { trigger: row, start: 'top 70%', once: true },
            },
          );
        }
      });
    }, el);

    return () => ctx.revert();
  }, []);

  return (
    <div className="career" ref={ref}>
      <div className="career__spine" aria-hidden="true">
        <span className="career__spine-fill" />
      </div>

      <ol className="career__list">
        {career.map((entry) => (
          <li className="career__row" key={entry.index}>
            <span className="career__node" aria-hidden="true" />

            <div className="career__period career__reveal">
              <span className="mono-label">{entry.period}</span>
            </div>

            <div className="career__body">
              <h3 className="career__role career__reveal">
                {entry.role}
                <span className="career__org">{entry.org}</span>
              </h3>
              <p className="career__summary career__reveal">{entry.summary}</p>

              {entry.highlights.length > 0 ? (
                <ul className="career__highlights career__reveal">
                  {entry.highlights.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              ) : null}

              {entry.stack.length > 0 ? (
                <div className="career__stack career__reveal">
                  {entry.stack.map((item) => (
                    <span className="tag" key={item}>
                      {item}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="career__meta career__reveal">
              <span className="mono-label">{entry.location}</span>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
