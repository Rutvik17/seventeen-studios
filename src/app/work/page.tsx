import type { Metadata } from 'next';
import { concepts } from '@/content/work';
import { Poster } from '@/components/Poster';
import { Reveal } from '@/components/motion/Reveal';
import { SplitText } from '@/components/motion/SplitText';
import { TransitionLink } from '@/components/Transition';
import { Marquee } from '@/components/Marquee';
import { marqueeItems } from '@/content/studio';

export const metadata: Metadata = {
  title: 'Concept briefs',
  description:
    'Five self-initiated engineering briefs, worked end to end: architecture, sequencing, projected outcomes and risk registers.',
};

export default function WorkIndexPage() {
  return (
    <div className="page">
      <header className="page-head">
        <span className="mono-label">Index — Concept briefs</span>
        <SplitText as="h1" className="page-head__title" stagger={0.03}>
          Work we would do
        </SplitText>
        <Reveal className="page-head__lead">
          <p>
            The studio is new and has no delivered client work to show. Rather
            than dress up something that is not there, we published the next best
            thing: five complete engagements, self-initiated, taken from problem
            statement through architecture to the numbers we would accept being
            measured against.
          </p>
        </Reveal>
        <Reveal className="page-head__note">
          <span className="mono-label">On these briefs</span>
          <p>
            Every one is labelled a concept. Every projected figure carries the
            method by which it would be measured. Nothing here is a claim about
            work already delivered.
          </p>
        </Reveal>
      </header>

      <Marquee items={marqueeItems} duration={34} />

      <div className="work-index">
        {concepts.map((concept) => (
          <Reveal key={concept.slug} distance={60}>
            <TransitionLink
              href={`/work/${concept.slug}/`}
              className="work-row"
              data-cursor="Read brief"
            >
              <div className="work-row__art">
                <Poster family={concept.poster} seed={concept.seed} />
              </div>

              <div className="work-row__meta">
                <span className="mono-label work-row__index">{concept.index}</span>
                <span className="mono-label">{concept.sector}</span>
                <span className="mono-label">{concept.discipline}</span>
                <span className="mono-label">{concept.timeline}</span>
              </div>

              <div className="work-row__main">
                <h2 className="work-row__name">
                  {concept.name}
                  <span className="work-row__title">{concept.title}</span>
                </h2>
                <p className="work-row__excerpt">{concept.excerpt}</p>
                <span className="link-arrow">
                  Read the brief <i aria-hidden="true">→</i>
                </span>
              </div>
            </TransitionLink>
          </Reveal>
        ))}
      </div>
    </div>
  );
}
