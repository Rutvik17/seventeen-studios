import type { Metadata } from 'next';
import { founder } from '@/content/founder';
import { site } from '@/content/studio';
import { Assembly } from '@/components/founder/Assembly';
import { Record } from '@/components/founder/Record';

/**
 * The founder page.
 *
 * Two things, in this order: MODEL A assembling itself as you scroll, and the
 * employment record underneath. The landing page draws the same device in SVG;
 * this page builds it as an object. They share the soldermask token, the
 * bitmap font and the firmware on the panel, and they disagree about the
 * panel itself — two pigments here, seven there — for a reason the working
 * column states.
 *
 * The route, its metadata and its place in the sitemap were never taken down.
 * It is the `url` on the Person node that every notebook lesson names as its
 * author.
 */
export const metadata: Metadata = {
  title: `${founder.name} — Founder`,
  description: founder.summary,
  openGraph: {
    title: `${founder.name} — Founder, ${site.name}`,
    description: founder.summary,
    type: 'profile',
  },
};

export default function FounderPage() {
  return (
    <>
      <Assembly />
      <Record />
    </>
  );
}
