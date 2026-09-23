import type { Metadata } from 'next';
import { ogImage } from '@/lib/og';
import { formatDate } from '@/lib/time';
import { Sheet } from '@/components/Sheet';
import { TransitionLink } from '@/components/Transition';
import { notebook } from '@/content/notebook';

const DESCRIPTION = 'The notebook in Rutvik Patel’s sketchbook, where he documents his journey as he learns something new every day.';

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
      <ol className="sheet__entries">
        {notebook.map((entry) => (
          <li key={entry.slug}>
            <TransitionLink href={`/notebook/${entry.slug}/`} className="sheet__entry" data-cursor="Read">
              <span className="mono-label">{formatDate(entry.date)}</span>
              <span className="sheet__entry-title">{entry.title}</span>
              <span className="sheet__entry-summary">{entry.summary}</span>
            </TransitionLink>
          </li>
        ))}
      </ol>
      <div className="sheet__ruled" aria-hidden="true">
        {Array.from({ length: 4 }).map((_, i) => (
          <span key={i} />
        ))}
        <span className="sheet__folio">p. 1</span>
      </div>
    </Sheet>
  );
}
