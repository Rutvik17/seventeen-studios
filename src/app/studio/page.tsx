import type { Metadata } from 'next';
import {
  studioStory,
  principles,
  engagements,
  faq,
  site,
  capabilities,
} from '@/content/studio';
import { Prose } from '@/components/Prose';
import { Reveal } from '@/components/motion/Reveal';
import { SplitText } from '@/components/motion/SplitText';
import { TransitionLink } from '@/components/Transition';

export const metadata: Metadata = {
  title: 'Studio',
  description:
    'How Seventeen Studios is built: senior-only, capped at five, priced by outcome, and honest about being new.',
};

export default function StudioPage() {
  return (
    <div className="page studio">
      <header className="page-head">
        <span className="mono-label">The studio</span>
        <SplitText as="h1" className="page-head__title" stagger={0.03}>
          Small by design
        </SplitText>
        <Reveal className="page-head__lead">
          <p>
            {site.name} is an independent engineering studio in {site.location}.
            Senior engineers only, a hard cap of five people, and a model built
            so that finishing well is the only way we win.
          </p>
        </Reveal>
      </header>

      <section className="studio__story">
        <div className="studio__story-label">
          <span className="mono-label">Position</span>
        </div>
        <Reveal className="studio__story-body" distance={40}>
          <Prose blocks={studioStory} />
        </Reveal>
      </section>

      <section className="section studio__principles">
        <Reveal className="section-header">
          <div className="section-header__top">
            <span className="mono-label section-header__index">01</span>
            <span className="mono-label">Operating principles</span>
          </div>
        </Reveal>

        <Reveal className="principles" stagger interval={0.07}>
          {principles.map((principle) => (
            <article className="principle" key={principle.index}>
              <span className="mono-label principle__index">{principle.index}</span>
              <h2 className="principle__title">{principle.title}</h2>
              <p className="principle__body">{principle.body}</p>
            </article>
          ))}
        </Reveal>
      </section>

      <section className="section studio__engagements">
        <Reveal className="section-header">
          <div className="section-header__top">
            <span className="mono-label section-header__index">02</span>
            <span className="mono-label">How to engage us</span>
          </div>
          <div className="section-header__title">
            <p className="section-header__lead">
              Three shapes. No hourly billing — it rewards slowness and punishes
              the shortcuts that come from experience.
            </p>
          </div>
        </Reveal>

        <Reveal className="engagements" stagger interval={0.09}>
          {engagements.map((engagement) => (
            <article className="engagement" key={engagement.name}>
              <div className="engagement__head">
                <h2 className="engagement__name">{engagement.name}</h2>
                <span className="mono-label">{engagement.price}</span>
              </div>
              <span className="mono-label engagement__duration">
                {engagement.duration}
              </span>
              <p className="engagement__summary">{engagement.summary}</p>
              <ul className="engagement__includes">
                {engagement.includes.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <p className="engagement__best">
                <span className="mono-label">Best when</span>
                {engagement.best}
              </p>
            </article>
          ))}
        </Reveal>
      </section>

      <section className="section studio__capabilities">
        <Reveal className="section-header">
          <div className="section-header__top">
            <span className="mono-label section-header__index">03</span>
            <span className="mono-label">Where we go deep</span>
          </div>
        </Reveal>
        <Reveal className="studio__cap-list" stagger interval={0.04}>
          {capabilities.map((capability) => (
            <div className="studio__cap" key={capability.title}>
              <h3>{capability.title}</h3>
              <p>{capability.description}</p>
            </div>
          ))}
        </Reveal>
      </section>

      <section className="section studio__faq">
        <Reveal className="section-header">
          <div className="section-header__top">
            <span className="mono-label section-header__index">04</span>
            <span className="mono-label">Questions we get asked</span>
          </div>
        </Reveal>

        <Reveal className="faq" stagger interval={0.05}>
          {faq.map((item) => (
            <details className="faq__item" key={item.question}>
              <summary data-cursor="Expand">
                <span className="faq__question">{item.question}</span>
                <span className="faq__marker" aria-hidden="true">
                  <i />
                  <i />
                </span>
              </summary>
              <p className="faq__answer">{item.answer}</p>
            </details>
          ))}
        </Reveal>
      </section>

      <Reveal className="case__cta">
        <p>Two engagement slots open. The next step is five questions.</p>
        <TransitionLink href="/start/" className="button button--solid" data-cursor="Start">
          Start a brief <i aria-hidden="true">→</i>
        </TransitionLink>
      </Reveal>
    </div>
  );
}
