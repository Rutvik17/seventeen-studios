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
      <h2 className="outro__question">
        What would you
        <br />
        like to build?
      </h2>
      <ContactLink className="outro__link" data-cursor="Write">
        Start a conversation
      </ContactLink>
    </section>
  );
}
