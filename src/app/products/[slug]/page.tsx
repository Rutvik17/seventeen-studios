import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { products, productBySlug } from '@/content/products';
import { Exploded } from '@/components/Exploded';
import { Prose } from '@/components/Prose';
import { Reveal } from '@/components/motion/Reveal';
import { SplitText } from '@/components/motion/SplitText';
import { TransitionLink } from '@/components/Transition';
import { ReadingProgress } from '@/components/ReadingProgress';
import { ContactLink } from '@/components/ContactLink';

interface Params {
  params: { slug: string };
}

export function generateStaticParams() {
  return products.map((product) => ({ slug: product.slug }));
}

export function generateMetadata({ params }: Params): Metadata {
  const product = productBySlug(params.slug);
  if (!product) return { title: 'Not found' };
  return {
    title: `${product.name} — ${product.tagline}`,
    description: product.summary,
    openGraph: {
      title: `${product.name} — ${product.tagline}`,
      description: product.summary,
      type: 'website',
    },
  };
}

/**
 * A product the studio built and ships.
 *
 * Its own route rather than a variant of `/work/[slug]`, and the reason is the
 * one label in the header: a concept brief announces itself as speculative on
 * every screen it appears on, and a shipped product must not carry that line.
 * Sharing the template would have meant a conditional deciding whether the page
 * is telling the truth about itself, which is exactly the kind of thing that
 * gets inverted by a later edit.
 */
export default function ProductPage({ params }: Params) {
  const product = productBySlug(params.slug);
  if (!product) notFound();

  return (
    <article className="page product">
      <ReadingProgress />

      <header className="product__head">
        <div className="product__head-meta">
          <TransitionLink href="/" className="link-back" data-cursor="Back">
            <i aria-hidden="true">←</i> Seventeen Studios
          </TransitionLink>
          <span className="mono-label product__status">
            Built and shipped by the studio · {product.status}
          </span>
        </div>

        <span className="mono-label product__index">{product.index}</span>
        <SplitText as="h1" className="product__name" stagger={0.04} depth>
          {product.name}
        </SplitText>
        <Reveal className="product__tagline">
          <p>{product.tagline}</p>
        </Reveal>
        <Reveal className="product__summary" delay={0.08}>
          <p>{product.summary}</p>
        </Reveal>

        <Reveal className="product__facts" delay={0.16}>
          <dl>
            <div>
              <dt className="mono-label">Platform</dt>
              <dd>{product.platform}</dd>
            </div>
            <div>
              <dt className="mono-label">Status</dt>
              <dd>{product.status}</dd>
            </div>
          </dl>
        </Reveal>
      </header>

      {/*
        The drawing does the positioning the copy would otherwise have to. It
        separates into the layers the product is actually made of, in the order
        a learner meets them — which is the same order the lessons run in.
      */}
      <section className="product__drawing">
        <Exploded
          caption={`${product.name} — what a lesson is made of`}
          layers={product.layers}
        />
      </section>

      {product.sections.map((section, i) => (
        <section className="product__section" key={section.label}>
          <div className="product__section-head">
            <span className="mono-label">
              {String(i + 1).padStart(2, '0')} — {section.label}
            </span>
            <SplitText as="h2" className="product__section-title">
              {section.heading}
            </SplitText>
          </div>
          <Prose blocks={section.blocks} />
        </section>
      ))}

      <section className="product__cta">
        <Reveal>
          <h2>Want something built to this standard?</h2>
          <p>
            Grasp is the studio&rsquo;s own product, so every decision in it is on
            the record — including the ones that were wrong first. That is the
            same way client work gets made here.
          </p>
          <p className="product__cta-actions">
            <ContactLink subject={`${product.name} — enquiry`} data-cursor="Write" />
          </p>
        </Reveal>
      </section>
    </article>
  );
}
