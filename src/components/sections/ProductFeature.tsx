'use client';

/**
 * The studio's own shipped software, on the home page.
 *
 * ---
 *
 * WHY THIS SITS ABOVE THE CONCEPT BRIEFS
 *
 * `WorkGallery` is speculative and says so on every card. This section is not.
 * A visitor scrolling past four labelled hypotheticals before reaching the one
 * thing the studio actually built and shipped would form the wrong impression of
 * which is the evidence — so the real product goes first and the briefs follow
 * it. That ordering is the honest one, and it is the reason the indices below
 * were renumbered rather than this section being appended at the end.
 *
 * The drawing carries the argument. It begins as a single plotted plane and
 * comes apart as the section scrolls, naming each layer as it separates — which
 * is both what the product is made of and the order a learner meets those parts
 * in. A screenshot could not say that; a list of features would have to assert
 * it. See `components/Exploded.tsx`.
 */

import { products } from '@/content/products';
import { SectionHeader } from '@/components/SectionHeader';
import { Reveal } from '@/components/motion/Reveal';
import { TransitionLink } from '@/components/Transition';
import { Exploded } from '@/components/Exploded';

export function ProductFeature() {
  // The home page features the first product. A second one would turn this into
  // a list, and the drawing does not survive being shown twice on one screen.
  const product = products[0];
  if (!product) return null;

  return (
    <section className="section product-feature" id="products">
      <SectionHeader
        index="04"
        label="Products"
        title={
          <p className="section-header__lead">
            The studio builds its own software too. Grasp is the first — and
            every decision inside it is on the record, including the ones that
            were wrong first.
          </p>
        }
        action={
          <TransitionLink
            href={`/products/${product.slug}/`}
            className="link-arrow"
            data-cursor="Open"
          >
            {product.name} <i aria-hidden="true">→</i>
          </TransitionLink>
        }
      />

      <div className="product-feature__body">
        <Reveal className="product-feature__intro">
          <span className="mono-label product-feature__status">
            {product.index} · {product.platform} · {product.status}
          </span>
          <h3 className="product-feature__name">
            {product.name}
            <span className="product-feature__tagline">{product.tagline}</span>
          </h3>
          <p className="product-feature__summary">{product.summary}</p>
          <TransitionLink
            href={`/products/${product.slug}/`}
            className="link-arrow"
            data-cursor="Open"
          >
            How it was built <i aria-hidden="true">→</i>
          </TransitionLink>
        </Reveal>

        <Exploded
          className="product-feature__drawing"
          caption="One lesson, taken apart"
          layers={product.layers}
        />
      </div>
    </section>
  );
}
