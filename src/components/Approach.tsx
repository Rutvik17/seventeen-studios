/**
 * Approach section — two-column sticky layout.
 * Left column sticks to `top: 120px` (see stylesheet); right column
 * scrolls past with the four-step process.
 */

import { RevealUp, RevealStagger, RevealWords, SectionLabel } from './Reveal';

const STEPS: Array<{ num: string; title: string; body: string }> = [
  {
    num: '01',
    title: 'Discovery & brief',
    body: 'We spend time understanding your business, your users, and the specific outcome you need before touching a line of code or a single design file.',
  },
  {
    num: '02',
    title: 'Architecture & prototyping',
    body: 'We define the technical and creative architecture upfront. Then we build a working prototype to validate direction before committing to the full build.',
  },
  {
    num: '03',
    title: 'Iterative build',
    body: 'Two-week sprints with a working demo at the end of every cycle. You see real progress, not status updates. Feedback loops stay tight.',
  },
  {
    num: '04',
    title: 'Launch & beyond',
    body: 'We do not disappear after shipping. We monitor, iterate, and stay engaged — because the real work often starts on day one of production.',
  },
];

export function Approach() {
  return (
    <section id="approach" className="approach">
      <div className="approach-sticky">
        <RevealUp>
          <SectionLabel>How we work</SectionLabel>
        </RevealUp>
        <RevealWords as="h2" className="approach-headline">
          {'Process built for '}
          <em>precision.</em>
        </RevealWords>
        <RevealUp as="p" className="approach-body">
          We are a new studio — and that is our advantage. No legacy
          processes, no sprawling account teams, no communication overhead.
          Every engagement is led directly by the people building it.
        </RevealUp>
        <RevealUp as="p" className="approach-body">
          We take on a small number of projects at a time to ensure every
          client gets our full attention. If we are not the right fit, we
          will tell you before you sign anything.
        </RevealUp>
      </div>
      <RevealStagger as="div" className="approach-steps">
        {STEPS.map((s) => (
          <div className="approach-step" key={s.num}>
            <div className="step-num">{s.num}</div>
            <div>
              <div className="step-title">{s.title}</div>
              <p className="step-body">{s.body}</p>
            </div>
          </div>
        ))}
      </RevealStagger>
    </section>
  );
}
