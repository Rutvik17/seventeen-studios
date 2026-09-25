import type { Metadata } from 'next';
import { ogImage } from '@/lib/og';
import { formatDate } from '@/lib/time';
import { NotebookBook } from '@/components/notebook/NotebookBook';
import { notebook, notebookBook } from '@/content/notebook';
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
 * The notebook: a watercolour sketchbook, sketched and painted, whose pages
 * turn as you scroll — the contents, then a spread for every entry in
 * `content/notebook.ts`, its title page on the left and its painting on the
 * right.
 */
export default function NotebookPage() {
  return (
    <NotebookBook
      copy={notebookBook}
      entries={notebook.map((e) => ({ slug: e.slug, title: e.title, date: formatDate(e.date), summary: e.summary }))}
    />
  );
}
