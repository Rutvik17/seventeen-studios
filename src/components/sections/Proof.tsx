import { proof } from '@/content/studio';
import { SectionHeader } from '@/components/SectionHeader';
import { Reveal } from '@/components/motion/Reveal';
import { RiskInstrument } from '@/components/instruments/RiskInstrument';

/**
 * Proof, for a studio that has no client list to point at.
 *
 * The section says that out loud in its own heading. Every alternative — stock
 * photography, a "trusted by" row of generic marks, a testimonial from a friend
 * — is a lie that a competent buyer detects in about two seconds, and being
 * caught at it costs more than the empty space would have.
 *
 * What replaces it has to be something a prospect can VERIFY, which rules out
 * anything that is merely asserted. A Monte Carlo running in their own browser,
 * printing its disagreement with the closed-form answer, is checkable by
 * exactly the reader this studio wants to be hired by.
 */
export function Proof() {
  return (
    <section className="section proof" id="proof">
      <SectionHeader
        index="03"
        label={proof.label}
        title={<p className="section-header__lead">{proof.lead}</p>}
      />
      <Reveal className="proof__intro">
        <p>{proof.body}</p>
      </Reveal>
      <RiskInstrument />
    </section>
  );
}
