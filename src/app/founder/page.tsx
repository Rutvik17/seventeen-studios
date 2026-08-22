import type { Metadata } from 'next';
import { founder } from '@/content/founder';
import { site } from '@/content/studio';

/**
 * The founder page — intentionally empty.
 *
 * What was here (a hand-drawn New York driven end to end, and before that eight
 * stacked sections of prose) has been removed so the page can be rebuilt from a
 * new idea. The route itself stays, deliberately: it is in the nav, in the
 * sitemap, and it is the `url` on the Person node that every notebook lesson
 * names as its author. Retiring the URL would break all three and cost the
 * accumulated indexing; an empty page costs nothing but a visit.
 *
 * The employment record the new page will be built from is still in
 * `content/founder.ts` and `content/resume.ts` — nothing factual was deleted.
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
  /*
    An empty `.page` shell rather than a bare fragment. The header is fixed, so
    a page with no height at all lets the footer ride up underneath it — blank
    is the intent, broken is not.
  */
  return <div className="page founder-blank" />;
}
