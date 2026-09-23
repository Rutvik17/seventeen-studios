import type { Metadata } from 'next';
import { ogImage } from '@/lib/og';
import { Sheet } from '@/components/Sheet';

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
 * The notebook: ruled pages, in the sketchbook's own style. Entries, when they
 * are written, belong in `src/content` and list here.
 */
export default function NotebookPage() {
  return (
    <Sheet
      kicker="Notebook"
      title="Something new, every day."
      lead={<p>This is where I document my journey as I learn.</p>}
    >
      <div className="sheet__ruled" aria-hidden="true">
        {Array.from({ length: 7 }).map((_, i) => (
          <span key={i} />
        ))}
        <span className="sheet__folio">p. 1</span>
      </div>
    </Sheet>
  );
}
