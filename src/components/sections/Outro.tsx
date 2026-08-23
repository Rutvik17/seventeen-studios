import { ContactLink } from '@/components/ContactLink';

/**
 * The close.
 *
 * One question and one link.
 *
 * What used to be here was an availability line, a concurrency limit and an
 * invitation to start a brief — an agency's closing pitch on a personal
 * portfolio, which reads as someone touting for freelance work rather than as
 * an engineer looking for a role. "What would you like to build?" is the only
 * sentence that belongs at the bottom of this page: it is an opening, it says
 * something true about how he thinks, and it works whether the reader is a
 * hiring manager, a collaborator or someone with an idea.
 */
export function Outro() {
  return (
    <section className="outro" id="contact">
      {/*
        This asked "What would you like to build?" and offered to "start a
        conversation" — a client pitch, left over from the agency the site
        stopped being. The people reading it are hiring managers and staff
        engineers who have just scrolled past the work; what they need at the
        bottom is an address, not an invitation to brief a studio.
      */}
      <h2 className="outro__question">
        Questions about
        <br />
        any of it?
      </h2>
      <ContactLink className="outro__link" data-cursor="Write">
        Email
      </ContactLink>
    </section>
  );
}
