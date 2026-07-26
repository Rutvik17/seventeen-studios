import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { concepts, getConcept } from '@/content/work';
import { Poster } from '@/components/Poster';
import { Prose } from '@/components/Prose';
import { Reveal } from '@/components/motion/Reveal';
import { SplitText } from '@/components/motion/SplitText';
import { TransitionLink } from '@/components/Transition';
import { ReadingProgress } from '@/components/ReadingProgress';

interface Params {
  params: { slug: string };
}

export function generateStaticParams() {
  return concepts.map((concept) => ({ slug: concept.slug }));
}

export function generateMetadata({ params }: Params): Metadata {
  const concept = getConcept(params.slug);
  if (!concept) return { title: 'Not found' };
  return {
    title: `${concept.name} — ${concept.title}`,
    description: concept.excerpt,
    openGraph: {
      title: `${concept.name} — ${concept.title}`,
      description: concept.excerpt,
      type: 'article',
    },
  };
}

export default function ConceptPage({ params }: Params) {
  const concept = getConcept(params.slug);
  if (!concept) notFound();

  const position = concepts.findIndex((item) => item.slug === concept.slug);
  const next = concepts[(position + 1) % concepts.length];

  return (
    <article className="page case">
      <ReadingProgress />

      <header className="case__head">
        <div className="case__head-meta">
          <TransitionLink href="/work/" className="link-back" data-cursor="Back">
            <i aria-hidden="true">←</i> All briefs
          </TransitionLink>
          <span className="mono-label case__status">
            Concept brief — not delivered client work
          </span>
        </div>

        <span className="mono-label case__index">{concept.index}</span>
        <SplitText as="h1" className="case__name" stagger={0.04} depth>
          {concept.name}
        </SplitText>
        <Reveal className="case__title">
          <p>{concept.title}</p>
        </Reveal>

        <Reveal className="case__facts" stagger interval={0.06}>
          <div className="case__fact">
            <span className="mono-label">Sector</span>
            <span>{concept.sector}</span>
          </div>
          <div className="case__fact">
            <span className="mono-label">Discipline</span>
            <span>{concept.discipline}</span>
          </div>
          <div className="case__fact">
            <span className="mono-label">Estimated build</span>
            <span>{concept.timeline}</span>
          </div>
          <div className="case__fact">
            <span className="mono-label">Year</span>
            <span>{concept.year}</span>
          </div>
        </Reveal>
      </header>

      <Reveal className="case__art" distance={70}>
        <Poster
          family={concept.poster}
          seed={concept.seed}
          label={`Generative artwork for the ${concept.name} concept brief`}
        />
      </Reveal>

      <Reveal className="case__premise">
        <span className="mono-label">Premise</span>
        <p>{concept.premise}</p>
      </Reveal>

      {concept.sections.map((section) => (
        <section className="case__section" key={section.label}>
          <div className="case__section-label">
            <span className="mono-label">{section.label}</span>
          </div>
          <div className="case__section-body">
            <Reveal>
              <h2 className="case__section-heading">{section.heading}</h2>
            </Reveal>
            <Reveal distance={34}>
              <Prose blocks={section.blocks} />
            </Reveal>
          </div>
        </section>
      ))}

      <section className="case__section case__section--wide">
        <div className="case__section-label">
          <span className="mono-label">Measurement</span>
        </div>
        <div className="case__section-body">
          <Reveal>
            <h2 className="case__section-heading">
              What we would be judged on
            </h2>
            <p className="case__section-note">
              These are projections, not results. Each one is stated with the
              method that would produce it, so the target can be argued with
              before anyone commits to it.
            </p>
          </Reveal>
          <Reveal className="metrics" stagger interval={0.08}>
            {concept.metrics.map((metric) => (
              <div className="metric" key={metric.label}>
                <span className="metric__value">{metric.value}</span>
                <span className="metric__label">{metric.label}</span>
                <p className="metric__method">{metric.method}</p>
              </div>
            ))}
          </Reveal>
        </div>
      </section>

      <section className="case__section case__section--wide">
        <div className="case__section-label">
          <span className="mono-label">Risk</span>
        </div>
        <div className="case__section-body">
          <Reveal>
            <h2 className="case__section-heading">
              What could sink it, and what we would do
            </h2>
          </Reveal>
          <Reveal className="risks" stagger interval={0.07}>
            {concept.risks.map((item) => (
              <div className="risk" key={item.risk}>
                <p className="risk__risk">{item.risk}</p>
                <p className="risk__mitigation">{item.mitigation}</p>
              </div>
            ))}
          </Reveal>
        </div>
      </section>

      <section className="case__section case__section--wide">
        <div className="case__section-label">
          <span className="mono-label">Stack</span>
        </div>
        <div className="case__section-body">
          <Reveal className="stack" stagger interval={0.06}>
            {concept.stack.map((group) => (
              <div className="stack__group" key={group.group}>
                <span className="mono-label">{group.group}</span>
                <div className="stack__items">
                  {group.items.map((item) => (
                    <span className="tag" key={item}>
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </Reveal>
        </div>
      </section>

      <Reveal className="case__next">
        <TransitionLink
          href={`/work/${next.slug}/`}
          className="next-link"
          data-cursor="Next brief"
        >
          <span className="mono-label">Next brief — {next.index}</span>
          <span className="next-link__name">{next.name}</span>
          <span className="next-link__title">{next.title}</span>
          <span className="link-arrow">
            Continue <i aria-hidden="true">→</i>
          </span>
        </TransitionLink>
      </Reveal>

      <Reveal className="case__cta">
        <p>
          If this is the shape of the problem you have, the next step is five
          questions and three minutes.
        </p>
        <TransitionLink href="/start/" className="button button--solid" data-cursor="Start">
          Start a brief <i aria-hidden="true">→</i>
        </TransitionLink>
      </Reveal>
    </article>
  );
}
