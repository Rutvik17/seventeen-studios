import type { Metadata } from 'next';
import { essays, essayReadingTime } from '@/content/thinking';
import { spell } from '@/lib/time';
import { Poster } from '@/components/Poster';
import { Reveal } from '@/components/motion/Reveal';
import { SplitText } from '@/components/motion/SplitText';
import { TransitionLink } from '@/components/Transition';

export const metadata: Metadata = {
  title: 'Thinking',
  description:
    'Essays on architecture, AI systems, creative engineering and how a small studio should operate.',
};

const formatter = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});

export default function ThinkingIndexPage() {
  return (
    <div className="page">
      <header className="page-head">
        <span className="mono-label">Index — Writing</span>
        <SplitText as="h1" className="page-head__title" stagger={0.03} depth>
          Thinking
        </SplitText>
        <Reveal className="page-head__lead">
          <p>
            We publish the reasoning before anyone commissions it. If you are
            deciding whether to brief this studio, these {spell(essays.length)}{' '}
            pieces will tell you more than any capabilities deck could.
          </p>
        </Reveal>
      </header>

      <div className="essay-index">
        {essays.map((essay) => (
          <Reveal key={essay.slug} distance={50}>
            <TransitionLink
              href={`/thinking/${essay.slug}/`}
              className="essay-row"
              data-cursor="Read"
            >
              <div className="essay-row__art">
                <Poster family="strata" seed={essay.seed} />
              </div>

              <div className="essay-row__main">
                <div className="essay-row__meta">
                  <span className="mono-label">{essay.index}</span>
                  <span className="mono-label">{essay.topic}</span>
                  <span className="mono-label">
                    {formatter.format(new Date(essay.date))}
                  </span>
                  <span className="mono-label">{essayReadingTime(essay)}</span>
                </div>
                <h2 className="essay-row__title">{essay.title}</h2>
                <p className="essay-row__excerpt">{essay.excerpt}</p>
                <span className="link-arrow">
                  Read <i aria-hidden="true">→</i>
                </span>
              </div>
            </TransitionLink>
          </Reveal>
        ))}
      </div>
    </div>
  );
}
