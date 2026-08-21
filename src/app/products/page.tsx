import type { Metadata } from 'next';
import { products } from '@/content/products';
import { Reveal } from '@/components/motion/Reveal';
import { SplitText } from '@/components/motion/SplitText';
import { TransitionLink } from '@/components/Transition';

export const metadata: Metadata = {
  title: 'Products',
  description:
    'Software the studio built and ships on its own account, rather than for a client.',
};

/**
 * The index the nav points at.
 *
 * It exists even though there is one product on it, because `/products/grasp/`
 * implies a `/products/` and a URL that 404s in the middle of a path the visitor
 * can see is a broken site. It says "one" in words rather than dressing a single
 * item up as a catalogue — rule 6 cuts both ways, and implying a product line
 * that does not exist yet would be the same lie as implying a client list.
 */
export default function ProductsIndexPage() {
  return (
    <div className="page">
      <header className="page-head">
        <span className="mono-label">Index — Products</span>
        <SplitText as="h1" className="page-head__title" stagger={0.03} depth>
          What we ship ourselves
        </SplitText>
        <Reveal className="page-head__lead">
          <p>
            One, so far. The studio&rsquo;s own software is where its arguments
            get tested at full cost — nobody else&rsquo;s budget absorbs a
            decision that turns out to be wrong, so the standard has to hold
            without anyone enforcing it.
          </p>
        </Reveal>
        <Reveal className="page-head__note">
          <span className="mono-label">Not client work</span>
          <p>
            These are the studio&rsquo;s products, built and paid for by the
            studio. The engagements we would take for other people are in the{' '}
            <TransitionLink href="/work/">concept briefs</TransitionLink>, and
            they are labelled speculative because they are.
          </p>
        </Reveal>
      </header>

      <div className="work-index">
        {products.map((product) => (
          <Reveal key={product.slug} distance={60}>
            <TransitionLink
              href={`/products/${product.slug}/`}
              className="work-row product-row"
              data-cursor="Open"
            >
              <div className="work-row__meta">
                <span className="mono-label work-row__index">{product.index}</span>
                <span className="mono-label">{product.platform}</span>
                <span className="mono-label">{product.status}</span>
              </div>

              <div className="work-row__main">
                <h2 className="work-row__name">
                  {product.name}
                  <span className="work-row__title">{product.tagline}</span>
                </h2>
                <p className="work-row__excerpt">{product.summary}</p>
                <span className="link-arrow">
                  How it was built <i aria-hidden="true">→</i>
                </span>
              </div>
            </TransitionLink>
          </Reveal>
        ))}
      </div>
    </div>
  );
}
