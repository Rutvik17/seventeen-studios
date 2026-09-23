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
    slug: 'rocket-physics',
    title: 'Rocket physics',
    summary: 'My first look at rockets: how they lift off, drop their empty stages, stay up in orbit and come home to land.',
    date: '2026-09-23',
    cardAlt: 'A pencil drawing of a rocket on a launch pad on the curve of the Earth',
  },
];

export function notebookEntry(slug: string): NotebookEntry {
  const entry = notebook.find((e) => e.slug === slug);
  if (!entry) throw new Error(`No notebook entry "${slug}"`);
  return entry;
}
