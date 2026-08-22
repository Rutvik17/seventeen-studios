'use client';

/**
 * The work index.
 *
 * A table, not a gallery of cards. Cards force every project into the same
 * rectangle and then need an image to fill it — which for software means a
 * screenshot, and a screenshot of an interactive thing is the least persuasive
 * artefact there is. A dense row list reads faster, scans like a CV, and puts
 * the checkable fact next to the name where a reviewer is already looking.
 */

import { useRef, useState } from 'react';
import { gsap, prefersReducedMotion } from '@/lib/gsap';
import { useIsomorphicLayoutEffect } from '@/hooks/useIsomorphicLayoutEffect';
import { projects } from '@/content/projects';
import { TransitionLink } from '@/components/Transition';

export function ProjectIndex() {
  const ref = useRef<HTMLElement>(null);
  const [active, setActive] = useState<string | null>(null);

  useIsomorphicLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (prefersReducedMotion()) return;

    const ctx = gsap.context(() => {
      gsap.from('[data-row]', {
        yPercent: 40,
        opacity: 0,
        duration: 0.7,
        ease: 'power3.out',
        stagger: 0.06,
        scrollTrigger: { trigger: el, start: 'top 78%' },
      });
    }, el);
    return () => ctx.revert();
  }, []);

  return (
    <section className="work-index" id="work" ref={ref}>
      <h2 className="work-index__head">
        <span className="mono-label">Work</span>
      </h2>

      <ul className="work-index__list">
        {projects.map((p) => (
          <li
            key={p.slug}
            data-row
            className={`work-row${active === p.slug ? ' is-active' : ''}`}
            onPointerEnter={() => setActive(p.slug)}
            onPointerLeave={() => setActive(null)}
          >
            <TransitionLink href={p.href} className="work-row__link" data-cursor="Open">
              <span className="work-row__index mono-label">{p.index}</span>
              <span className="work-row__name">{p.name}</span>
              <span className="work-row__line">{p.line}</span>
              <span className="work-row__meta">
                {p.metric && <em className="work-row__metric">{p.metric}</em>}
                <span className="work-row__stack">
                  {p.stack.map((s) => (
                    <i key={s}>{s}</i>
                  ))}
                </span>
              </span>
              <span
                className={`work-row__status work-row__status--${p.status
                  .toLowerCase()
                  .replace(/\s+/g, '-')}`}
              >
                {p.status}
              </span>
            </TransitionLink>
          </li>
        ))}
      </ul>
    </section>
  );
}
