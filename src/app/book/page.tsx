import type { Metadata } from 'next';
import { ogImage } from '@/lib/og';
import { BookAccount } from '@/components/book/BookAccount';
import { SplitText } from '@/components/motion/SplitText';
import { Reveal } from '@/components/motion/Reveal';

const DESCRIPTION =
  'A trading account run by a gradient-boosted model: $10,000 compounded through fourteen years of the S&P 500, every position it holds now, every year it held them, and the survivorship bias measured rather than waved at.';

export const metadata: Metadata = {
  title: 'The Book',
  description: DESCRIPTION,
  openGraph: {
    title: 'The Book',
    description: DESCRIPTION,
    images: ogImage('book', 'An equity curve climbing across fourteen years, drawn as the card for a model-run trading account'),
  },
};

/**
 * THE BOOK.
 *
 * It was a section on the lab page and it had outgrown one. A backtest is a
 * chart; an account is a chart, a balance, a list of what is held, and a record
 * of what was traded — which is four things and its own page.
 *
 * "The book" is what a desk calls the set of positions it is carrying. The name
 * is the jargon rather than a description because the page is the thing itself,
 * not an explanation of it.
 */
export default function BookPage() {
  return (
    <div className="page book-page">
      <header className="page-head">
        <span className="mono-label">Portfolio</span>
        <SplitText as="h1" className="page-head__title" stagger={0.03} depth>
          The Book
        </SplitText>
        <Reveal className="page-head__lead">
          <p>
            A model picks the positions. It rebalances monthly, marks to market
            daily, and pays to borrow what it shorts. This is the account that
            came out.
          </p>
        </Reveal>
      </header>

      <BookAccount />
    </div>
  );
}
