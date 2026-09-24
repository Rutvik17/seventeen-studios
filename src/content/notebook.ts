/**
 * The notebook's entries.
 *
 * One object per entry. The notebook page lists them, the sitemap includes
 * them and `scripts/build-og.mjs` draws each a share card, all from this list;
 * the entry's own page lives at `app/notebook/<slug>/`.
 */

export type NotebookEntry = {
  slug: string;
  title: string;
  /** One sentence: what the entry is. */
  summary: string;
  /** The day it was written, YYYY-MM-DD. A date that happened, so it stays literal. */
  date: string;
  /** Alt text for its share card. */
  cardAlt: string;
};

export const notebook: NotebookEntry[] = [
  {
    slug: 'earth-we-live-on',
    title: 'Earth we live on',
    summary: 'It’s more water than land.',
    date: '2026-09-24',
    cardAlt: 'A globe painted in acrylic: pencil coastlines, green and ochre land and a deep blue sea',
  },
];

/** The way back from an entry to the notebook. */
export const notebookBack = { href: '/notebook/', label: 'Notebook' } as const;

export function notebookEntry(slug: string): NotebookEntry {
  const entry = notebook.find((e) => e.slug === slug);
  if (!entry) throw new Error(`No notebook entry "${slug}"`);
  return entry;
}
