import type { Metadata } from 'next';
import { founder } from '@/content/founder';
import { site } from '@/content/studio';
import { City } from '@/components/founder/City';

/**
 * The founder page is the city, and nothing else.
 *
 * It used to be eight stacked sections — a hero, a marquee, a statement, a
 * record, a grid of side work, a stack, a row of counters, a call to action.
 * All of it said in prose what the drawing now says by being walked through,
 * and the drawing cannot share a page with a scroll of text: the canvas is
 * pinned for its whole length, so anything after it is something you reach by
 * scrolling past the story rather than by finishing it.
 *
 * So there is one component here. Everything the old sections carried is a beat
 * on the route.
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
  return <City />;
}
