import type { Metadata } from 'next';
import { ogImage } from '@/lib/og';
import { formatDate } from '@/lib/time';
import { Sheet } from '@/components/Sheet';
import { Continents } from '@/components/notebook/Continents';
import { Globe } from '@/components/notebook/Globe';
import { notebookBack, notebookEntry } from '@/content/notebook';
import styles from '@/components/notebook/Globe.module.css';

const entry = notebookEntry('earth-we-live-on');

export const metadata: Metadata = {
  title: entry.title,
  description: entry.summary,
  openGraph: {
    title: `${entry.title} — Seventeen Studios`,
    description: entry.summary,
    images: ogImage(`notebook-${entry.slug}`, entry.cardAlt),
  },
};

export default function EarthWeLiveOnPage() {
  return (
    <Sheet back={notebookBack} kicker={`Notebook · ${formatDate(entry.date)}`} title={entry.title} lead={<p>{entry.summary}</p>}>
      <div className={styles.entry}>
        <Globe />
        <Continents />
      </div>
    </Sheet>
  );
}
