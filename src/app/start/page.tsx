import type { Metadata } from 'next';
import { site } from '@/content/studio';
import { ContactLink } from '@/components/ContactLink';
import { Reveal } from '@/components/motion/Reveal';
import { SplitText } from '@/components/motion/SplitText';

export const metadata: Metadata = {
  title: 'Contact',
  description: 'What would you like to build?',
};

/**
 * Contact.
 *
 * A question and three ways to answer it.
 *
 * This page used to be a five-step brief builder that asked for a service, a
 * stage, a timeline and a budget — a qualification funnel, which is a thing an
 * agency needs and a portfolio actively should not have. It asked a hiring
 * manager to categorise themselves before they could say hello, and it framed
 * every visitor as a prospective client when most of them are not.
 *
 * One line, one link, and the two profiles a technical reader will want anyway.
 */
export default function StartPage() {
  return (
    <div className="page contact-page">
      <header className="page-head">
        <span className="mono-label">Contact</span>
        <SplitText as="h1" className="page-head__title" stagger={0.03} depth>
          What would you like to build?
        </SplitText>
        <Reveal className="page-head__lead">
          <p>
            Roles, collaborations, or an idea you want a second opinion on —
            all welcome. Replies come from Rutvik, usually within a day.
          </p>
        </Reveal>
      </header>

      <Reveal className="contact-page__links">
        <ContactLink className="contact-page__primary" data-cursor="Write">
          Write to me
        </ContactLink>
        <ul className="contact-page__elsewhere">
          {site.social
            .filter((item) => !('contact' in item))
            .map((item) => (
              <li key={item.label}>
                <a href={item.href} target="_blank" rel="noreferrer noopener">
                  {item.label}
                </a>
              </li>
            ))}
          <li>
            <span className="mono-label">{site.location}</span>
          </li>
        </ul>
      </Reveal>
    </div>
  );
}
