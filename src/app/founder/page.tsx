import { statSync } from 'node:fs';
import path from 'node:path';
import type { Metadata } from 'next';
import { ogImage } from '@/lib/og';
import { founder, founderFilm } from '@/content/founder';
import { FounderFilm } from '@/components/founder/FounderFilm';

/**
 * The founder page: a film, painted as the landing's is — Rutvik sketched
 * from his photograph, then the 0s and 1s underneath everything and the GPU
 * that AI runs on, and back to him.
 *
 * The route is also the `url` on the Person node every notebook lesson names
 * as its author, and the address printed on the résumé itself.
 */

const DESCRIPTION = `${founder.name}, ${founder.title} at ${founder.employer}, ${founder.focus} — and what his work runs on, from 0s and 1s to a GPU, sketched and painted.`;

export const metadata: Metadata = {
  /*
    "Founder", not "Rutvik Patel — Founder". The root layout appends
    "— Rutvik Patel" to every child title.
  */
  title: 'Founder',
  description: DESCRIPTION,
  openGraph: {
    title: `${founder.name} — ${founder.title}, ${founder.employer}`,
    description: DESCRIPTION,
    type: 'profile',
    images: ogImage('founder', `${founder.name}, ${founder.title} at ${founder.employer}`),
  },
};

/*
  The file sizes are read from disk at build time — this is a server component
  and the export runs it once — so the size beside each download is the size of
  the file actually shipped.
*/
function sizeOf(file: string): string {
  return `${Math.round(statSync(path.join(process.cwd(), file)).size / 1024)} KB`;
}

export default function FounderPage() {
  const sizes = Object.fromEntries(founderFilm.downloads.map((d) => [d.format, sizeOf(d.file)]));
  return <FounderFilm sizes={sizes} />;
}
