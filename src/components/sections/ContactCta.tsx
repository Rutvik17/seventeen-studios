'use client';

import { site } from '@/content/studio';
import { SplitText } from '@/components/motion/SplitText';
import { Reveal } from '@/components/motion/Reveal';
import { Magnetic } from '@/components/motion/Magnetic';
import { TransitionLink } from '@/components/Transition';
import { ContactLink } from '@/components/ContactLink';

/**
 * Closing call to action. One decision, made obvious: start a brief.
 */
export function ContactCta() {
  return (
    <section className="section contact" id="contact">
      <div className="contact__inner">
        <span className="mono-label">Next step</span>

        <SplitText
          as="h2"
          className="contact__headline"
          mode="words"
          stagger={0.05}
        >
          Tell us what is actually{' '}
          <em className="accent">hard</em> about it.
        </SplitText>

        <Reveal className="contact__body" stagger interval={0.1}>
          <p>
            Five questions, three minutes, and a real reply from the person who
            would do the work. If we are the wrong studio for it, we will say so
            and point you somewhere better.
          </p>
          <div className="contact__actions">
            <Magnetic strength={0.4}>
              <TransitionLink
                href="/start/"
                className="button button--solid"
                data-cursor="Start"
              >
                Start a brief
                <i aria-hidden="true">→</i>
              </TransitionLink>
            </Magnetic>
            <ContactLink className="contact__email" />
          </div>
        </Reveal>

        <Reveal className="contact__rows" stagger interval={0.08}>
          <div className="contact__row">
            <span className="mono-label">Availability</span>
            <span>{site.availability}</span>
          </div>
          <div className="contact__row">
            <span className="mono-label">Based in</span>
            <span>
              {site.location} — working across North America and Europe
            </span>
          </div>
          <div className="contact__row">
            <span className="mono-label">Engagements</span>
            <span>Diagnostic · Build sprint · Studio partner</span>
          </div>
          <div className="contact__row">
            <span className="mono-label">Response time</span>
            <span>Within two working days, from a human</span>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
