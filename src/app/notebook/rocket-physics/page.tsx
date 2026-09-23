import type { Metadata } from 'next';
import { ogImage } from '@/lib/og';
import { formatDate } from '@/lib/time';
import { Sheet } from '@/components/Sheet';
import { RocketPhysics } from '@/components/notebook/RocketPhysics';
import { notebookEntry } from '@/content/notebook';

const entry = notebookEntry('rocket-physics');

export const metadata: Metadata = {
  title: entry.title,
  description: entry.summary,
  openGraph: {
    title: `${entry.title} — Seventeen Studios`,
    description: entry.summary,
    images: ogImage(`notebook-${entry.slug}`, entry.cardAlt),
  },
};

export default function RocketPhysicsPage() {
  return (
    <Sheet kicker={`Notebook · ${formatDate(entry.date)}`} title={entry.title} lead={<p>{entry.summary}</p>}>
      <RocketPhysics />
    </Sheet>
  );
}
