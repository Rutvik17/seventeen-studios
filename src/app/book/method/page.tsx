import type { Metadata } from 'next';
import { ogImage } from '@/lib/og';
import { EngineMethod } from '@/components/book/EngineMethod';
import { SplitText } from '@/components/motion/SplitText';
import { Reveal } from '@/components/motion/Reveal';

const DESCRIPTION =
  'How the trading model is built: six data families, the four construction methods that were implemented and switched off by a measurement, and five look-ahead guards that are each negative-tested.';

export const metadata: Metadata = {
  title: 'Method',
  description: DESCRIPTION,
  openGraph: {
    title: 'The Book · Method',
    description: DESCRIPTION,
    images: ogImage('book', 'How the trading model is built and what was measured away'),
  },
};

/**
 * THE METHOD BEHIND THE BOOK.
 *
 * `/book` answers what the account did. This answers how, and — the part that
 * took most of the work — what was tried and thrown away.
 *
 * Four construction methods were implemented in full and turned off by a
 * measurement: concentration, Gârleanu-Pedersen trading, confidence sizing, and
 * the full covariance. Showing only what survived would imply the survivors
 * were obvious, when each one won against a plausible alternative.
 */
export default function MethodPage() {
  return (
    <div className="page book-page">
      <header className="page-head">
        <span className="mono-label">The Book · Method</span>
        <SplitText as="h1" className="page-head__title" stagger={0.03} depth>
          What it reads, and what it ignores
        </SplitText>
        <Reveal className="page-head__lead">
          <p>
            Six data families, ninety columns, and four construction methods that
            were built, measured and switched off. The rejected ones are the
            interesting half.
          </p>
        </Reveal>
      </header>

      <EngineMethod />
    </div>
  );
}
