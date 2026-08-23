import type { Metadata } from 'next';
import { products } from '@/content/products';
import { projects } from '@/content/projects';
import { Reveal } from '@/components/motion/Reveal';
import { SplitText } from '@/components/motion/SplitText';
import { TransitionLink } from '@/components/Transition';
import { ProductRows } from '@/components/sections/ProductRows';

export const metadata: Metadata = {
  title: 'Products',
  /*
    Names the product. "Software built and shipped on my own account" described
    the category and left the search result and the link preview saying nothing
    about what the software is — and there is exactly one, so there is no reason
    to be general about it.
  */
  description:
    'Grasp — an iOS app that teaches calculus by making every idea something you drag. Nine lessons, four surfaces each.',
};

/**
 * The products index.
 *
 * It exists even with one product on it, because `/products/grasp/` implies a
 * `/products/` and a URL that 404s in the middle of a path a visitor can see is
 * a broken site.
 */
export default function ProductsIndexPage() {
  return (
    <>
      <div className="page page--head-only">
        <header className="page-head page-head--flush">
        <span className="mono-label">Products</span>
        <SplitText as="h1" className="page-head__title" stagger={0.03} depth>
          Shipped
        </SplitText>
        <Reveal className="page-head__lead">
          <p>
            One, so far. The rest of the work is in the{' '}
            <TransitionLink href="/lab/">lab</TransitionLink>.
          </p>
        </Reveal>
        </header>
      </div>

      <ProductRows
        rows={products.map((product) => {
          // Products and projects overlap by slug, so a product's row picks up
          // the same colour it carries on the home page rather than defining a
          // second palette that would drift out of step.
          const project = projects.find((p) => p.slug === product.slug);
          return {
            id: product.slug,
            title: product.name,
            tag: product.platform,
            meta: product.tagline,
            href: `/products/${product.slug}/`,
            color: project?.color ?? '#dce5fc',
            ink: project?.ink ?? '#12379c',
            trail: product.status,
          };
        })}
      />
    </>
  );
}
