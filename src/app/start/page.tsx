import type { Metadata } from 'next';
import { ogImage } from '@/lib/og';
import { site } from '@/content/studio';
import { ContactLink } from '@/components/ContactLink';
import { Reveal } from '@/components/motion/Reveal';
import { SplitText } from '@/components/motion/SplitText';

const DESCRIPTION =
  'Contact Rutvik Patel — engineering roles, technical questions, or anything on this site.';

export const metadata: Metadata = {
  title: 'Contact',
  description: DESCRIPTION,
  openGraph: { title: 'Contact Rutvik Patel', description: DESCRIPTION, images: ogImage('start', "The Seventeen Studios 17 mark on paper") },
};

/**
 * Contact.
 *
 * One statement of what the inbox is for, one link, and the profiles a
 * technical reader will want anyway.
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
        {/*
          "What would you like to build?" was here and in the page's metadata —
          the last of the agency, asking every visitor to brief a studio. Most
          of them are hiring managers who have just read the work.

          The reply-time line went with it: "usually within a day" is a service
          promise nobody can check, and rule 8 says nothing on this site is
          claimed that was not measured.
        */}
        <SplitText as="h1" className="page-head__title" stagger={0.03} depth>
          Roles, questions, second opinions.
        </SplitText>
        <Reveal className="page-head__lead">
          <p>
            Anything on this site is fair game — the mathematics, the hardware,
            or how a page was built.
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
