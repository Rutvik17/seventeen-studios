import type { Metadata } from 'next';
import { RiskInstrument } from '@/components/instruments/RiskInstrument';
import { CreditInstrument } from '@/components/instruments/CreditInstrument';
import { RigDemo } from '@/components/instruments/RigDemo';
import { SplitText } from '@/components/motion/SplitText';
import { Reveal } from '@/components/motion/Reveal';

export const metadata: Metadata = {
  title: 'Lab',
  description:
    'Working instruments — a Monte Carlo risk desk on real market data, and a character rigged on springs and inverse kinematics.',
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
        <SplitText as="h1" className="page-head__title" stagger={0.03} depth>
          Things that run
        </SplitText>
        <Reveal className="page-head__lead">
          <p>Move the inputs. Everything recomputes in your browser.</p>
        </Reveal>
      </header>

      <section className="lab__block" id="risk">
        <RiskInstrument />
      </section>

      <section className="lab__block" id="credit">
        <h2 className="lab__title">
          <span className="mono-label">02</span> What a lender has to survive
        </h2>
        <CreditInstrument />
      </section>

      <section className="lab__block" id="companion">
        <h2 className="lab__title">
          <span className="mono-label">03</span> Mochi, taken apart
        </h2>
        <RigDemo />
      </section>
    </div>
  );
}
