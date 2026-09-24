import type { Metadata } from 'next';
import { ogImage } from '@/lib/og';
import { formatDate } from '@/lib/time';
import { Sheet } from '@/components/Sheet';
import { IndexList } from '@/components/IndexList';
import { notebook } from '@/content/notebook';
import { founder } from '@/content/founder';

const DESCRIPTION = `${founder.name}’s notebook: what he is learning, worked through one entry at a time.`;

export const metadata: Metadata = {
  title: 'Notebook',
  description: DESCRIPTION,
  openGraph: {
    title: 'Notebook — Seventeen Studios',
    description: DESCRIPTION,
    images: ogImage('notebook', 'A blank, ruled notebook page with a pencil resting on it'),
  },
};

/**
 * The notebook: every entry in `content/notebook.ts`, each written on a ruled
 * line, and a few blank lines under them for the next.
 */
export default function NotebookPage() {
  return (
    <Sheet
      kicker="Notebook"
      title="Something new, every day."
      lead={<p>This is where I document my journey as I learn.</p>}
    >
      <IndexList
        cursor="Read"
        items={notebook.map((entry, i) => ({
          key: entry.slug,
          href: `/notebook/${entry.slug}/`,
          mark: String(i + 1),
          label: formatDate(entry.date),
          title: entry.title,
          note: entry.summary,
        }))}
      />
      <div className="sheet__ruled" aria-hidden="true">
        {Array.from({ length: 4 }).map((_, i) => (
          <span key={i} />
        ))}
        <span className="sheet__folio">p. 1</span>
      </div>
    </Sheet>
  );
}
