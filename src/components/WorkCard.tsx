'use client';

import type { Concept } from '@/content/types';
import { useTilt } from '@/hooks/useTilt';
import { Poster } from './Poster';
import { TransitionLink } from './Transition';

/**
 * A single concept brief card. Used in the pinned horizontal gallery and, in
 * a stacked variant, on the work index.
 */
export function WorkCard({
  concept,
  variant = 'gallery',
}: {
  concept: Concept;
  variant?: 'gallery' | 'index';
}) {
  const ref = useTilt<HTMLDivElement>(7);

  return (
    <article className={`work-card work-card--${variant}`}>
      <div className="work-card__tilt" ref={ref}>
        <TransitionLink
          href={`/work/${concept.slug}/`}
          className="work-card__link"
          data-cursor="Read brief"
        >
          <span className="work-card__bar" aria-hidden="true" />

          <div className="work-card__art">
            <Poster family={concept.poster} seed={concept.seed} />
            <span className="work-card__index mono-label">{concept.index}</span>
            <span className="work-card__status mono-label">Concept</span>
          </div>

          <div className="work-card__body">
            <div className="work-card__meta">
              <span className="mono-label">{concept.sector}</span>
              <span className="mono-label">{concept.year}</span>
            </div>
            <h3 className="work-card__name">{concept.name}</h3>
            <p className="work-card__title">{concept.title}</p>
            <p className="work-card__excerpt">{concept.excerpt}</p>
            <span className="work-card__cta">
              Read the brief
              <i aria-hidden="true">→</i>
            </span>
          </div>
        </TransitionLink>
      </div>
    </article>
  );
}
