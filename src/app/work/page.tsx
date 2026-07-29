import type { Metadata } from 'next';
import { concepts } from '@/content/work';
import { spellCapitalised } from '@/lib/time';
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
        <SplitText as="h1" className="page-head__title" stagger={0.03} depth>
          Work we would do
        </SplitText>
        <Reveal className="page-head__lead">
          <p>
            {spellCapitalised(concepts.length)} complete engagements, taken from
            problem statement through architecture to the numbers we would
            accept being measured against. Each one is a real industry problem
            worked the way we would work yours — and published in full, before
            anyone has paid for it.
          </p>
        </Reveal>
        <Reveal className="page-head__note">
          <span className="mono-label">On these briefs</span>
          <p>
            These are concept briefs: engagements we designed rather than
            delivered. Every projected figure carries the method by which it
            would be measured, so the targets can be argued with on their
            merits.
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
