'use client';

/**
 * Brief builder.
 *
 * A five-step form that composes a plain-text brief and hands it off through
 * a `mailto:` link — no backend, no third-party form service, nothing to leak,
 * and it works on a static host. The live preview on the left is the point:
 * you can see exactly what will be sent before you send it.
 */

import { useMemo, useRef, useState } from 'react';
import { gsap, prefersReducedMotion } from '@/lib/gsap';
import { useIsomorphicLayoutEffect } from '@/hooks/useIsomorphicLayoutEffect';
import { site } from '@/content/studio';
import { services } from '@/content/services';
import { Magnetic } from './motion/Magnetic';

const STAGES = [
  'An idea, nothing built yet',
  'A prototype that needs to become real',
  'A live product that has stopped scaling',
  'A legacy system somebody has to modernise',
];

const TIMELINES = [
  'Starting now',
  'This quarter',
  'Next quarter',
  'Exploring, no date yet',
];

const BUDGETS = [
  'Under $25k',
  '$25k – $75k',
  '$75k – $150k',
  '$150k+',
  'Not established yet',
];

interface BriefState {
  service: string;
  stage: string;
  timeline: string;
  budget: string;
  detail: string;
  name: string;
  email: string;
  company: string;
}

const EMPTY: BriefState = {
  service: '',
  stage: '',
  timeline: '',
  budget: '',
  detail: '',
  name: '',
  email: '',
  company: '',
};

const STEPS = [
  { label: 'Discipline', question: 'What kind of work is this?' },
  { label: 'Stage', question: 'Where is it today?' },
  { label: 'Timing', question: 'When would it start?' },
  { label: 'Budget', question: 'What is the budget band?' },
  { label: 'Detail', question: 'What is actually hard about it?' },
];

export function BriefBuilder() {
  const [step, setStep] = useState(0);
  const [brief, setBrief] = useState<BriefState>(EMPTY);
  const [copied, setCopied] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const set = <K extends keyof BriefState>(key: K, value: BriefState[K]) =>
    setBrief((current) => ({ ...current, [key]: value }));

  // Advance automatically on the single-choice steps; the last step needs a
  // deliberate submit because it contains free text.
  const choose = <K extends keyof BriefState>(key: K, value: BriefState[K]) => {
    set(key, value);
    if (step < STEPS.length - 1) window.setTimeout(() => setStep(step + 1), 180);
  };

  useIsomorphicLayoutEffect(() => {
    const el = panelRef.current;
    if (!el) return;
    if (prefersReducedMotion()) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        el.querySelectorAll('.builder__animate'),
        { y: 26, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.6, stagger: 0.045, ease: 'power3.out' },
      );
    }, el);
    return () => ctx.revert();
  }, [step]);

  const composed = useMemo(() => {
    const lines = [
      `Discipline: ${brief.service || '—'}`,
      `Stage: ${brief.stage || '—'}`,
      `Timing: ${brief.timeline || '—'}`,
      `Budget: ${brief.budget || '—'}`,
      '',
      'What is hard about it:',
      brief.detail || '—',
      '',
      `From: ${brief.name || '—'}${brief.company ? ` · ${brief.company}` : ''}`,
      `Reply to: ${brief.email || '—'}`,
    ];
    return lines.join('\n');
  }, [brief]);

  const mailto = useMemo(() => {
    const subject = `New brief — ${brief.service || 'Engineering'}${
      brief.company ? ` · ${brief.company}` : ''
    }`;
    return `mailto:${site.email}?subject=${encodeURIComponent(
      subject,
    )}&body=${encodeURIComponent(composed)}`;
  }, [brief.service, brief.company, composed]);

  const complete =
    brief.service && brief.stage && brief.timeline && brief.budget && brief.detail.trim();

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(composed);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="builder">
      <aside className="builder__summary">
        <span className="mono-label">Your brief</span>

        <ol className="builder__steps">
          {STEPS.map((item, index) => (
            <li
              key={item.label}
              className={`builder__step${index === step ? ' is-current' : ''}${
                index < step ? ' is-done' : ''
              }`}
            >
              <button type="button" onClick={() => setStep(index)}>
                <span className="mono-label">{String(index + 1).padStart(2, '0')}</span>
                <span className="builder__step-label">{item.label}</span>
                <span className="builder__step-value">
                  {[brief.service, brief.stage, brief.timeline, brief.budget, brief.detail][
                    index
                  ] || '—'}
                </span>
              </button>
            </li>
          ))}
        </ol>

        <div className="builder__preview">
          <span className="mono-label">Message preview</span>
          <pre>{composed}</pre>
        </div>
      </aside>

      <div className="builder__panel" ref={panelRef}>
        <div className="builder__progress" aria-hidden="true">
          <span style={{ transform: `scaleX(${(step + 1) / STEPS.length})` }} />
        </div>

        <span className="mono-label builder__animate">
          Step {step + 1} of {STEPS.length}
        </span>
        <h2 className="builder__question builder__animate">{STEPS[step].question}</h2>

        {step === 0 ? (
          <div className="builder__options builder__animate">
            {services.map((service) => (
              <button
                type="button"
                key={service.id}
                className={`builder__option${
                  brief.service === service.title ? ' is-selected' : ''
                }`}
                onClick={() => choose('service', service.title)}
              >
                <span className="mono-label">{service.index}</span>
                <span className="builder__option-title">{service.title}</span>
                <span className="builder__option-note">{service.summary}</span>
              </button>
            ))}
            <button
              type="button"
              className={`builder__option${
                brief.service === 'Not sure yet' ? ' is-selected' : ''
              }`}
              onClick={() => choose('service', 'Not sure yet')}
            >
              <span className="mono-label">05</span>
              <span className="builder__option-title">Not sure yet</span>
              <span className="builder__option-note">
                Describe it and we will tell you which it is.
              </span>
            </button>
          </div>
        ) : null}

        {step === 1 ? (
          <div className="builder__options builder__options--list builder__animate">
            {STAGES.map((stage) => (
              <button
                type="button"
                key={stage}
                className={`builder__option${brief.stage === stage ? ' is-selected' : ''}`}
                onClick={() => choose('stage', stage)}
              >
                <span className="builder__option-title">{stage}</span>
              </button>
            ))}
          </div>
        ) : null}

        {step === 2 ? (
          <div className="builder__options builder__options--list builder__animate">
            {TIMELINES.map((timeline) => (
              <button
                type="button"
                key={timeline}
                className={`builder__option${
                  brief.timeline === timeline ? ' is-selected' : ''
                }`}
                onClick={() => choose('timeline', timeline)}
              >
                <span className="builder__option-title">{timeline}</span>
              </button>
            ))}
          </div>
        ) : null}

        {step === 3 ? (
          <div className="builder__options builder__options--list builder__animate">
            {BUDGETS.map((budget) => (
              <button
                type="button"
                key={budget}
                className={`builder__option${
                  brief.budget === budget ? ' is-selected' : ''
                }`}
                onClick={() => choose('budget', budget)}
              >
                <span className="builder__option-title">{budget}</span>
              </button>
            ))}
            <p className="builder__hint">
              Asked early on purpose. If the number and the ambition do not match,
              that is a conversation worth having in the first email rather than
              the fourth.
            </p>
          </div>
        ) : null}

        {step === 4 ? (
          <div className="builder__fields builder__animate">
            <label className="builder__field">
              <span className="mono-label">The hard part</span>
              <textarea
                rows={6}
                value={brief.detail}
                onChange={(event) => set('detail', event.target.value)}
                placeholder="What have you already tried? What breaks? What would have to be true for this to be worth building?"
              />
            </label>

            <div className="builder__field-row">
              <label className="builder__field">
                <span className="mono-label">Name</span>
                <input
                  type="text"
                  value={brief.name}
                  onChange={(event) => set('name', event.target.value)}
                />
              </label>
              <label className="builder__field">
                <span className="mono-label">Email</span>
                <input
                  type="email"
                  value={brief.email}
                  onChange={(event) => set('email', event.target.value)}
                />
              </label>
              <label className="builder__field">
                <span className="mono-label">Company</span>
                <input
                  type="text"
                  value={brief.company}
                  onChange={(event) => set('company', event.target.value)}
                />
              </label>
            </div>

            <div className="builder__submit">
              <Magnetic strength={0.35}>
                <a
                  href={complete ? mailto : undefined}
                  className={`button button--solid${complete ? '' : ' is-disabled'}`}
                  aria-disabled={!complete}
                  data-cursor={complete ? 'Send' : 'Incomplete'}
                >
                  Send the brief <i aria-hidden="true">→</i>
                </a>
              </Magnetic>
              <button type="button" className="button button--ghost" onClick={copy}>
                {copied ? 'Copied' : 'Copy as text'}
              </button>
            </div>

            <p className="builder__hint">
              This opens your email client with the brief filled in — nothing is
              submitted to a server, and nothing is stored by this site. Prefer
              plain email? <a href={`mailto:${site.email}`}>{site.email}</a>.
            </p>
          </div>
        ) : null}

        <div className="builder__nav">
          <button
            type="button"
            className="builder__nav-button"
            onClick={() => setStep(Math.max(0, step - 1))}
            disabled={step === 0}
          >
            <i aria-hidden="true">←</i> Back
          </button>
          <button
            type="button"
            className="builder__nav-button"
            onClick={() => setStep(Math.min(STEPS.length - 1, step + 1))}
            disabled={step === STEPS.length - 1}
          >
            Next <i aria-hidden="true">→</i>
          </button>
        </div>
      </div>
    </div>
  );
}
