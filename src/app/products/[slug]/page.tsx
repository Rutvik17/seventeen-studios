import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { products, productBySlug } from '@/content/products';
import { Chalkboard } from '@/components/grasp/Chalkboard';
import { DerivativeInstrument } from '@/components/instruments/DerivativeInstrument';
import { TransitionLink } from '@/components/Transition';
import styles from '@/components/grasp/Grasp.module.css';

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
 * Grasp's landing — a lesson, not a pitch.
 *
 * ---
 *
 * WHAT WAS HERE, AND WHY IT IS NOT ANY MORE
 *
 * A product header with a summary and a facts table, an exploded axonometric
 * drawing of "what a lesson is made of", four prose sections arguing for the
 * product's approach, and a closing panel asking whether you wanted something
 * built to this standard.
 *
 * All of it was the page TALKING ABOUT a product whose entire claim is that you
 * do not need to be talked to — that you understand calculus by watching it
 * happen and then moving it yourself. Three paragraphs asking to be believed is
 * that claim failing on its own front door.
 *
 * So the page is now the demonstration, end to end. A board writes the
 * derivative of x² out of first principles as you scroll. Then you drag it.
 * Then there is one way onward. There is no sentence anywhere on it that the
 * board does not need.
 *
 * ---
 *
 * ONE PRODUCT, ONE ROUTE
 *
 * This route is still `/products/[slug]/` and still generates from the product
 * table, but the body it renders is Grasp's lesson rather than a template. A
 * second product would need a branch here — deliberately at this level, where
 * it is visible, rather than as a conditional threaded through a shared layout
 * that would slowly become bespoke anyway.
 */
export default function ProductPage({ params }: Params) {
  const product = productBySlug(params.slug);
  if (!product) notFound();

  return (
    <article className={styles.world} data-slate>
      {/*
        The whole of the page's chrome. The name and the four words under it are
        what a reader needs to know where they are; everything else about the
        product is demonstrated below rather than claimed here.
      */}
      <header className={styles.head}>
        <TransitionLink href="/" className={styles.back} data-cursor="Back">
          <i aria-hidden="true">←</i> Seventeen Studios
        </TransitionLink>
        <h1 className={styles.name}>{product.name}</h1>
        <p className={styles.tagline}>{product.tagline}</p>
      </header>

      <Chalkboard />

      {/*
        The board proves the derivative exists. This is where it stops being a
        performance: the same function, the same arithmetic, under the reader's
        own hand. It keeps its light palette on purpose — the one thing on the
        page meant to be TOUCHED should not look like part of the drawing.
      */}
      <section className={styles.demo}>
        <div className={styles.demoHead}>
          <span className={`mono-label ${styles.demoLabel}`}>Now you</span>
          <h2 className={styles.demoTitle}>Drag the point. Watch the slopes make a curve.</h2>
        </div>
        <DerivativeInstrument />
      </section>

      <section className={styles.out}>
        <p className={styles.outLine}>That was one lesson of nine.</p>
        <TransitionLink href="/grasp/" className={styles.learn} data-cursor="Start">
          Learn calculus <i aria-hidden="true">→</i>
        </TransitionLink>
        <span className={styles.outNote}>
          {product.platform} · {product.status}
        </span>
      </section>
    </article>
  );
}
