import type { Metadata } from 'next';
import { founder, founderPage } from '@/content/founder';
import { site } from '@/content/studio';
import { market } from '@/content/market';
import { Assembly } from '@/components/founder/Assembly';
import { Resume } from '@/components/founder/Resume';
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

/*
  What the device prints on its own display.

  `at` is null here and stays null through the export: the clock starts on the
  client. Putting `Date.now()` in this module would run it at BUILD time under
  static export, and every visitor would see the minute the deploy happened.
  `stamp` is the build instant, which is what the panel reads for the one frame
  before the clock takes over.
*/
const panel: PanelData = {
  name: founder.name,
  role: founderPage.panelRole,
  employer: founderPage.panelEmployer,
  location: founder.location,
  at: null,
  stamp: market.fetchedAt,
};

export default function FounderPage() {
  return (
    <>
      <Assembly data={panel} />
      <Resume />
    </>
  );
}
