import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ogImage } from '@/lib/og';
import { policies, policyBySlug } from '@/content/policies';
import { Prose } from '@/components/Prose';
import { Reveal } from '@/components/motion/Reveal';
import { SplitText } from '@/components/motion/SplitText';
import { TransitionLink } from '@/components/Transition';
import { ContactLink } from '@/components/ContactLink';

interface Params {
  params: { slug: string };
}

export function generateStaticParams() {
  return policies.map((policy) => ({ slug: policy.slug }));
}

export function generateMetadata({ params }: Params): Metadata {
  const policy = policyBySlug(params.slug);
  if (!policy) return { title: 'Not found' };
  return {
    title: policy.title,
    description: policy.scope,
    /*
      Derived from the policy, like the title and the description above it, so
      the three cannot drift apart. Without an `openGraph` block at all this
      route inherited the root's — which would have posted a privacy policy
      under the landing page's title and picture.
    */
    openGraph: {
      title: policy.title,
      description: policy.scope,
      images: ogImage(`legal-${policy.slug}`, `${policy.title} — Seventeen Studios`),
    },
    // A policy is a reference document, not something to surface in a feed.
    robots: { index: true, follow: true },
  };
}

/**
 * A legal page.
 *
 * Deliberately the plainest layout on the site: no scroll choreography, no
 * split-text on the body, nothing that arrives late. Somebody reading this is
 * either checking a specific claim or is an App Store reviewer verifying that
 * the app behaves as described, and both want the text immediately and all at
 * once. Animating a privacy policy would be a small act of contempt.
 */
export default function LegalPage({ params }: Params) {
  const policy = policyBySlug(params.slug);
  if (!policy) notFound();

  return (
    <article className="page legal">
      <header className="legal__head">
        <TransitionLink href="/" className="link-back" data-cursor="Back">
          <i aria-hidden="true">←</i> Seventeen Studios
        </TransitionLink>

        <SplitText as="h1" className="legal__title">
          {policy.title}
        </SplitText>
        <Reveal className="legal__scope">
          <p>{policy.scope}</p>
        </Reveal>
        <p className="mono-label legal__updated">Last updated {policy.updated}</p>
      </header>

      <div className="legal__body">
        <Prose blocks={policy.blocks} />
      </div>

      <footer className="legal__foot">
        <p>
          Anything unclear here is worth asking about rather than guessing at.{' '}
          <ContactLink subject={`${policy.title} — question`} data-cursor="Write" />
          .
        </p>
        <nav className="legal__nav">
          {policies
            .filter((p) => p.slug !== policy.slug)
            .map((p) => (
              <TransitionLink key={p.slug} href={`/legal/${p.slug}/`}>
                {p.title}
              </TransitionLink>
            ))}
        </nav>
      </footer>
    </article>
  );
}
