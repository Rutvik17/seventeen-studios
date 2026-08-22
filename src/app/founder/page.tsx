import type { Metadata } from 'next';
import {
  founder,
  founderStatement,
  founderStack,
  founderStats,
  founderMarquee,
  sideWork,
} from '@/content/founder';
import { site } from '@/content/studio';
import { Portrait } from '@/components/founder/Portrait';
import { ResumeControl } from '@/components/founder/ResumeModal';
import { Career } from '@/components/founder/Career';
import { CountUp } from '@/components/founder/CountUp';
import { Marquee } from '@/components/Marquee';
import { Reveal } from '@/components/motion/Reveal';
import { SplitText } from '@/components/motion/SplitText';
import { Magnetic } from '@/components/motion/Magnetic';
import { TransitionLink } from '@/components/Transition';
import { SectionHeader } from '@/components/SectionHeader';
import { CAREER_START, spellCapitalised, yearsOfExperience } from '@/lib/time';
import { ContactLink } from '@/components/ContactLink';

export const metadata: Metadata = {
  title: `${founder.name} — Founder`,
  description: founder.summary,
  openGraph: {
    title: `${founder.name} — Founder, ${site.name}`,
    description: founder.summary,
    type: 'profile',
  },
};

export default function FounderPage() {
  return (
    <div className="page founder">
      <header className="founder__hero">
        <div className="founder__hero-main">
          <span className="mono-label">Founder</span>

          <SplitText as="h1" className="founder__name" stagger={0.035} depth>
            {founder.name}
          </SplitText>

          <Reveal className="founder__standfirst">
            <p>{founder.standfirst}</p>
          </Reveal>

          <Reveal className="founder__facts" stagger interval={0.07}>
            <div className="founder__fact">
              <span className="mono-label">Role</span>
              <span>{founder.role}</span>
            </div>
            <div className="founder__fact">
              <span className="mono-label">Based</span>
              <span>{founder.location}</span>
            </div>
            <div className="founder__fact">
              <span className="mono-label">Shipping since</span>
              <span>{CAREER_START.getUTCFullYear()}</span>
            </div>
          </Reveal>

          <Reveal className="founder__actions">
            <Magnetic strength={0.35}>
              <TransitionLink
                href="/start/"
                className="button button--solid"
                data-cursor="Start"
              >
                Start a brief <i aria-hidden="true">→</i>
              </TransitionLink>
            </Magnetic>
            <ResumeControl />
          </Reveal>
        </div>

        <div className="founder__hero-portrait">
          <Portrait src={founder.portrait} alt={founder.portraitAlt} />
        </div>
      </header>

      <Marquee items={founderMarquee} duration={30} />

      <section className="section founder__statement">
        <span className="mono-label">Position</span>
        <div className="founder__statement-body">
          {founderStatement.map((line) => (
            <SplitText
              as="p"
              className="founder__statement-line"
              mode="words"
              scrub
              stagger={0.05}
              key={line.accent}
            >
              {line.lead} <em className="accent">{line.accent}</em> {line.tail}
            </SplitText>
          ))}
        </div>
      </section>

      <section className="section founder__career" id="record">
        <SectionHeader
          index="01"
          label="Professional record"
          title={
            <p className="section-header__lead">
              {spellCapitalised(yearsOfExperience())} years of production
              engineering, delivered inside the organisations below.
            </p>
          }
        />
        <Career />
      </section>

      <section className="section founder__side">
        <SectionHeader index="02" label="Built independently" />
        <Reveal className="founder__side-grid" stagger interval={0.09}>
          {sideWork.map((item) => (
            <article className="side-card" key={item.title}>
              <div className="side-card__head">
                <h3>{item.title}</h3>
                <span className="mono-label">{item.year}</span>
              </div>
              <span className="mono-label side-card__role">{item.role}</span>
              <p>{item.description}</p>
              <div className="side-card__stack">
                {item.stack.map((tech) => (
                  <span className="tag" key={tech}>
                    {tech}
                  </span>
                ))}
              </div>
              {item.href ? (
                <a
                  href={item.href}
                  className="link-arrow"
                  target="_blank"
                  rel="noreferrer noopener"
                  data-cursor="Open"
                >
                  Source <i aria-hidden="true">↗</i>
                </a>
              ) : null}
            </article>
          ))}
        </Reveal>
      </section>

      <section className="section founder__stack">
        <SectionHeader index="03" label="Working tools" />
        <Reveal className="stack" stagger interval={0.06}>
          {founderStack.map((group) => (
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
      </section>

      <section className="section founder__stats">
        <Reveal className="founder__stats-grid" stagger interval={0.08}>
          {founderStats.map((stat) => (
            <div className="founder__stat" key={stat.label}>
              <span className="mono-label">{stat.label}</span>
              <span className="founder__stat-value">
                <CountUp value={stat.value} />
                {stat.suffix ? <em className="accent">{stat.suffix}</em> : null}
              </span>
              <span className="founder__stat-note">{stat.note}</span>
            </div>
          ))}
        </Reveal>
      </section>

      <Reveal className="case__cta">
        <p>
          The person who answers your first email is the person who writes the
          code. That is the whole proposition.
        </p>
        <div className="founder__cta-actions">
          <Magnetic strength={0.35}>
            <TransitionLink
              href="/start/"
              className="button button--solid"
              data-cursor="Start"
            >
              Start a brief <i aria-hidden="true">→</i>
            </TransitionLink>
          </Magnetic>
          <ContactLink className="contact__email" />
        </div>
      </Reveal>
    </div>
  );
}
