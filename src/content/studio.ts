/**
 * Site copy.
 *
 * ---
 *
 * WHAT THIS SITE IS, AND WHAT IT STOPPED BEING
 *
 * Seventeen Studios is Rutvik's portfolio — an engineer's digital footprint,
 * built to be read by hiring managers and staff engineers at large companies.
 * It is NOT an agency site, and every trace of that framing has been removed:
 * no engagements, no availability, no slot counts, no process diagram, no
 * principles, no "we".
 *
 * That framing was actively harmful for the actual goal. A senior engineering
 * candidate who appears to be running a consultancy on the side reads as
 * divided, and a reviewer skimming for evidence of ability has to wade through
 * sales copy to find any. The work is the evidence; the words exist only to
 * label it.
 *
 * ---
 *
 * THE RULE THAT REPLACED THE OLD ONE
 *
 * **A sentence earns its place by saying something the demonstration cannot.**
 * Everything else is cut. If a paragraph explains what a project does, the
 * project is not doing enough on screen — fix the project, delete the
 * paragraph. Nobody reads a portfolio; they scan it and then they play with
 * whatever moves.
 */

import { foundedYear, spellCapitalised, yearsOfExperience } from '@/lib/time';
import { resumeHeader } from './resume';

export const site = {
  name: 'Seventeen Studios',
  wordmark: 'SEVENTEEN',
  wordmarkSecond: 'STUDIOS',
  tagline: 'The sketchbook of Rutvik Patel.',
  description:
    'Seventeen Studios is Rutvik Patel’s sketchbook — a software engineer’s work, drawn in pencil: the founder’s story, a notebook, and Grasp.',
  founded: String(foundedYear()),
  location: 'Toronto, Canada',
  timezone: 'America/Toronto',
  timezoneLabel: 'ET',
  /*
    There is deliberately no `email` field. It is assembled on the client by
    `lib/contact.ts` so the address never lands in the static export — see the
    note there.
  */
  /*
    Built from the résumé's header rather than written out again here:
    `resumeHeader` is the canonical contact record — it is what the generated
    PDF and DOCX print — and these are the same values with a scheme on the
    front, so the two cannot drift.
  */
  social: [
    { label: 'GitHub', href: `https://${resumeHeader.github}` },
    { label: 'LinkedIn', href: `https://${resumeHeader.linkedin}` },
  ],
} as const;

/** The tabs down the top edge of the book. Three sections, one name each. */
export const nav = [
  { label: 'Notebook', href: '/notebook/' },
  { label: 'Grasp', href: '/grasp/' },
  { label: 'Founder', href: '/founder/' },
] as const;

/**
 * The landing: the sketchbook's contents page.
 *
 * The whole site is one sketchbook, and this is where it opens: the title drawn
 * in pencil, one line about what is inside, and the contents — each chapter a
 * page you can turn to, with a small drawing of what is on it.
 */
export const cover = {
  wordmarkTop: 'SEVENTEEN',
  wordmarkBottom: 'STUDIOS',
  shelfmark: 'Sketchbook No. 17',
  owner: 'kept by Rutvik Patel, Toronto',
  line: 'A software engineer’s sketchbook. Sketching one page at a time.',
  contents: 'Contents',
  cursor: 'Turn to it',
} as const;

export type Chapter = {
  numeral: string;
  title: string;
  note: string;
  href: string;
  /** Which small drawing sits beside it — see `components/sections/Contents.tsx`. */
  doodle: 'head' | 'notebook' | 'tangent';
};

export const chapters: Chapter[] = [
  {
    numeral: 'I',
    title: 'The founder',
    note: `${spellCapitalised(yearsOfExperience())} years of work, from a first job in Kanata to enterprise AI at EY — and the résumé in the back pocket.`,
    href: '/founder/',
    doodle: 'head',
  },
  {
    numeral: 'II',
    title: 'Notebook',
    note: 'Blank pages, for now. The next things I build get drawn here first.',
    href: '/notebook/',
    doodle: 'notebook',
  },
  {
    numeral: 'III',
    title: 'Grasp',
    note: 'Calculus you learn by dragging it — being built right here, on this site.',
    href: '/grasp/',
    doodle: 'tangent',
  },
];

/**
 * The footer is the book's back endpaper: the page every sketchbook has inside
 * its back cover, with the owner's name and where to send it if it is found.
 */
export const endpaper = {
  found: 'If found, please return to',
  owner: 'Rutvik Patel',
  place: 'Toronto, Canada',
  write: 'Write to me',
  label: 'Sketchbook No. 17',
} as const;
