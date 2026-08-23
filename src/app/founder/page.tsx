import type { Metadata } from 'next';
import { founder, founderPage } from '@/content/founder';
import { site } from '@/content/studio';
import { yearsOfExperience } from '@/lib/time';
import { assetBySymbol, market } from '@/content/market';
import { Assembly } from '@/components/founder/Assembly';
import { Record } from '@/components/founder/Record';
import type { PanelData } from '@/lib/founder/panel';

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

const NVDA = assetBySymbol(founderPage.panelSymbol);

const panel: PanelData = {
  name: founder.name,
  role: founder.role,
  location: founder.location,
  years: String(yearsOfExperience()),
  employer: founderPage.panelEmployer,
  symbol: founderPage.panelSymbol,
  price: NVDA?.price ?? 0,
  changePercent: NVDA?.changeDay ?? 0,
  percentile: NVDA?.sentiment?.percentile ?? 0.5,
  at: null,
  stamp: market.fetchedAt,
};

export default function FounderPage() {
  return (
    <>
      <Assembly data={panel} />
      <Record />
    </>
  );
}
