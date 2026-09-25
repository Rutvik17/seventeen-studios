import { statSync } from 'node:fs';
import path from 'node:path';
import type { Metadata } from 'next';
import { share } from '@/lib/og';
import { founder, founderFilm } from '@/content/founder';
import { FounderFilm } from '@/components/founder/FounderFilm';

/**
 * The founder page: Rutvik, sketched from a photograph of him and painted as
 * the landing's film is, with his name and what he does beside him.
 *
 * The route is also the address printed on the résumé itself.
 */

const DESCRIPTION = `${founder.name}, ${founder.title} at ${founder.employer}, ${founder.focus}. Sketched in pencil and painted in watercolour from a photograph of him.`;

export const metadata: Metadata = {
  /*
    "Founder", not "Rutvik Patel — Founder". The root layout appends
    "— Rutvik Patel" to every child title.
  */
  title: 'Founder',
  description: DESCRIPTION,
  ...share({
    title: `${founder.name} — ${founder.title}, ${founder.employer}`,
    description: DESCRIPTION,
    path: '/founder/',
    type: 'profile',
    image: 'founder',
    alt: `${founder.name}, painted in watercolour from a photograph, with his name and what he does beside him`,
  }),
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
