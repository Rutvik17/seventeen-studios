/**
 * Manifesto section — a two-column "who we are" statement. The large
 * Syne 800 headline uses the RevealWords effect; the supporting paragraph
 * below uses a simple RevealUp.
 */

import { RevealUp, RevealWords, SectionLabel } from './Reveal';

export function Manifesto() {
  return (
    <section id="manifesto" className="manifesto">
      <RevealUp as="div" className="manifesto-label">
        <SectionLabel>Who we are</SectionLabel>
      </RevealUp>
      <div>
        <RevealWords as="p" className="manifesto-text">
          {'We are engineers and makers who believe the best digital products sit at the intersection of '}
          <em>technical rigour</em>
          {' and genuine craft.'}
        </RevealWords>
        <RevealUp as="p" className="manifesto-sub">
          Seventeen Studios is a creative engineering studio founded to close
          the gap between what technology can do and what most agencies
          actually build. We are small by design, senior by default, and
          obsessive about the work.
        </RevealUp>
      </div>
    </section>
  );
}
