import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ogImage } from '@/lib/og';
import { policies, policyBySlug } from '@/content/policies';
import { Prose } from '@/components/Prose';
import { Sheet } from '@/components/Sheet';
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
    // Derived from the policy, like the title and description, so the three cannot drift apart.
    openGraph: {
      title: policy.title,
      description: policy.scope,
      images: ogImage(`legal-${policy.slug}`, `${policy.title} — Seventeen Studios`),
    },
  };
}

export default function LegalPage({ params }: Params) {
  const policy = policyBySlug(params.slug);
  if (!policy) notFound();

  return (
    <Sheet
      className="sheet--legal"
      kicker={`Legal · updated ${policy.updated}`}
      title={policy.title}
      lead={<p>{policy.scope}</p>}
    >
      <div className="sheet__prose">
        <Prose blocks={policy.blocks} />
        <p className="sheet__aside">
          Anything unclear here is worth asking about.{' '}
          <ContactLink subject={`${policy.title} — question`} data-cursor="Write">
            Write to me
          </ContactLink>
          .
        </p>
      </div>
    </Sheet>
  );
}
