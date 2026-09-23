import type { Metadata } from 'next';
import { ogImage } from '@/lib/og';
import { site } from '@/content/studio';
import { ContactLink } from '@/components/ContactLink';
import { Sheet } from '@/components/Sheet';

const DESCRIPTION = 'Write to Rutvik Patel — roles, questions, or anything in the sketchbook.';

export const metadata: Metadata = {
  title: 'Contact',
  description: DESCRIPTION,
  openGraph: { title: 'Write to Rutvik Patel', description: DESCRIPTION, images: ogImage('start', 'The 17 mark, drawn in pencil on sketchbook paper') },
};

/**
 * Contact. Also the page every email link falls back to when the script that
 * assembles the address has not run — so it has to work on its own.
 */
export default function StartPage() {
  return (
    <Sheet kicker="Contact" title="Write to me." lead={<p>Roles, questions, or something in the sketchbook you want to talk about.</p>}>
      <div className="sheet__actions">
        <ContactLink className="sheet__primary" data-cursor="Write">
          Write an email
        </ContactLink>
        {site.social.map((item) => (
          <a key={item.label} href={item.href} target="_blank" rel="noreferrer noopener">
            {item.label}
          </a>
        ))}
        <span className="mono-label">{site.location}</span>
      </div>
    </Sheet>
  );
}
