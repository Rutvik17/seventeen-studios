import type { Metadata } from 'next';
import { ogImage } from '@/lib/og';
import { RiskInstrument } from '@/components/instruments/RiskInstrument';
import { CreditInstrument } from '@/components/instruments/CreditInstrument';
import { RigDemo } from '@/components/instruments/RigDemo';
import { SplitText } from '@/components/motion/SplitText';
import { Reveal } from '@/components/motion/Reveal';

/*
  Names all three. The heading and the lead were updated to say what is on this
  page and this was not, so search results and link previews still advertised
  two instruments where there are three — the credit model, which is the most
  quantitative thing here, was the one missing.
*/
const DESCRIPTION =
  'Working instruments: a Monte Carlo value-at-risk desk on real market data, a credit model decomposing expected loss and capital, and a character rig on springs and two-bone inverse kinematics.';

export const metadata: Metadata = {
  title: 'Lab',
  description: DESCRIPTION,
  // Without this the route inherits the root's `og:title` and shares itself as
  // "Seventeen Studios", which is the brand rather than the page.
  openGraph: { title: 'Working instruments', description: DESCRIPTION, images: ogImage('lab', "The Monte Carlo terminal-value distribution, with the worst 5 percent of outcomes marked off at the value-at-risk cut") },
};

/**
 * The lab.
 *
 * Everything on this page runs. It replaced a set of essays, and that swap is
 * the whole editorial argument of the site: an essay about how carefully
 * someone thinks is a claim, and a simulation whose inputs the reader can move
 * is evidence. One of those survives a sceptical reader.
 *
 * Each instrument shows its own working — the risk desk prints its
 * disagreement with the closed-form answer, the rig exposes its constants — so
 * nothing here has to be taken on faith.
 */
export default function LabPage() {
  return (
    <div className="page lab">
      <header className="page-head">
        <span className="mono-label">Lab</span>
        {/*
          "Things that run" was the heading here, and it was the same failure
          the notebook had: a phrase that sounds like the site rather than a
          label that says what is on the page. A reader scanning for evidence
          of quantitative work should be able to see it from the heading.
        */}
        <SplitText as="h1" className="page-head__title" stagger={0.03} depth>
          Working instruments
        </SplitText>
        <Reveal className="page-head__lead">
          <p>
            A Monte Carlo risk desk, a credit model and a physics rig. Move the
            inputs — everything recomputes in your browser.
          </p>
        </Reveal>
      </header>

      <section className="lab__block" id="risk">
        <RiskInstrument />
      </section>

      <section className="lab__block" id="credit">
        <h2 className="lab__title">
          <span className="mono-label">02</span> Credit risk: expected loss and
          required capital
        </h2>
        <CreditInstrument />
      </section>

      <section className="lab__block" id="companion">
        <h2 className="lab__title">
          <span className="mono-label">03</span> Character rig: springs,
          pendulum and inverse kinematics
        </h2>
        <RigDemo />
      </section>
    </div>
  );
}
