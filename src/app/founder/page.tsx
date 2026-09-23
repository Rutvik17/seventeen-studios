import { statSync } from 'node:fs';
import path from 'node:path';
import type { Metadata } from 'next';
import { ogImage } from '@/lib/og';
import { careerStart, founder, founderPage } from '@/content/founder';
import { Book } from '@/components/founder/Book';

/**
 * The founder page: the sketchbook itself — cover, prologue, a chapter for
 * each stretch of the career, and the résumé in the back pocket.
 *
 * The route is also the `url` on the Person node every notebook lesson names
 * as its author, and the address printed on the résumé itself.
 */

const DESCRIPTION = `${founder.name}, ${founder.title} at ${founder.employer}. Every role since ${careerStart}, and the résumé as PDF or DOCX.`;

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
    images: ogImage(
      'founder',
      'A pencil drawing of a suspension bridge on sketchbook paper, its cables washed in crimson',
    ),
  },
};

/*
  The file sizes are read from disk at build time — this is a server component
  and the export runs it once — so the size beside each download is the size of
  the file actually shipped, and regenerating the résumé cannot leave it stale.
*/
function sizeOf(file: string): string {
  return `${Math.round(statSync(path.join(process.cwd(), file)).size / 1024)} KB`;
}

export default function FounderPage() {
  const sizes = Object.fromEntries(founderPage.downloads.map((d) => [d.format, sizeOf(d.file)]));
  return <Book sizes={sizes} />;
}
