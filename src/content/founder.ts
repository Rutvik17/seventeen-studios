/**
 * Rutvik, as data.
 *
 * The identity the rest of the site states — the tab title, the share cards —
 * and the few strings the founder page sets. The career itself lives in
 * `resume.ts`, which is the source `scripts/build-resume.mjs` generates the PDF
 * and the .docx from, and which the founder page lists from directly.
 */

import { asset } from '@/lib/asset';

export const founder = {
  name: 'Rutvik Patel',
  role: 'Software Engineer',
  location: 'Toronto, Canada',
  /*
    What the founder page's closing card reads. Not `role`: that is the site's
    own sentence-case description of him; this is his title where he works.

    THE EMPLOYER IS "EY", NOT "ERNST & YOUNG"
    The firm rebranded in 2013. "EY" is not an abbreviation of the current name,
    it IS the current name — the one on their letterhead and on ey.com — and
    "Ernst & Young" is the older legal entity. The résumé's company header
    carries the long form, which is where a reader meets the name cold; this is
    the short form after first reference.
  */
  title: 'Senior Software Engineer',
  employer: 'EY',
} as const;

/**
 * The founder page: a sketchbook that draws a story, then a card and the
 * résumé.
 *
 * The scene names are the only words on the story. They show as a running
 * label while it plays, and as the captions of the storyboard that replaces the
 * animation for anyone who has asked for reduced motion.
 */
export const founderPage = {
  scenes: [
    'The blank page',
    'The spark',
    'The obstacle',
    'The breakthrough',
    'The finished page',
  ],
  /** What the canvas shows, for anyone who cannot see it. */
  description:
    'A sketchbook opens. A spark draws a head in profile with an idea inside it; a swarm of scribbles and ink drops breaks the drawing apart; the pieces reassemble as a clean drawing of a suspension bridge.',
  cta: 'Turn Page to Enter',
  skip: 'Skip',
  replay: 'Replay',
  resumeLabel: 'Résumé',
  resumeTitle: 'The record',
  downloads: [
    {
      format: 'PDF',
      note: 'To read, print or forward',
      href: asset('/founder/rutvik-patel-resume.pdf'),
      file: 'public/founder/rutvik-patel-resume.pdf',
    },
    {
      format: 'DOCX',
      note: 'For applicant tracking systems',
      href: asset('/founder/rutvik-patel-resume.docx'),
      file: 'public/founder/rutvik-patel-resume.docx',
    },
  ],
} as const;
