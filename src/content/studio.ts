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


import type { CityId } from '@/lib/sketch/skylines';
import { founder } from './founder';

export const site = {
  name: 'Seventeen Studios',
  description: `The sketchbook of ${founder.name}, ${founder.title} at ${founder.employer}, ${founder.focus}.`,
  location: 'Toronto, Canada',
  /*
    There is deliberately no `email` field. It is assembled on the client by
    `lib/contact.ts` so the address never lands in the static export — see the
    note there.
  */
  social: [
    { label: 'GitHub', href: 'https://github.com/Rutvik17' },
    { label: 'LinkedIn', href: 'https://linkedin.com/in/rutvik1702' },
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
  wordmarkTop: 'Seventeen',
  wordmarkBottom: 'Studios',
  /** The label on the cover: what the book is, and which one. */
  shelfmark: { name: 'Sketchbook', number: 'No. 17' },
  owner: 'kept by Rutvik Patel, Toronto',
  /** One line about what is inside, and the second half of it picked out with a wash of paint. */
  line: 'A software engineer’s sketchbook.',
  motto: 'Sketching one page at a time.',
  contents: 'Contents',
  cursor: 'Turn to it',
} as const;

/**
 * The cities drawn beside the cover's title, in the order they are drawn —
 * home first. Their drawings are in `lib/sketch/skylines.ts`.
 */
export const skylines: { id: CityId; name: string }[] = [
  { id: 'toronto', name: 'Toronto' },
  { id: 'new-york', name: 'New York' },
  { id: 'london', name: 'London' },
  { id: 'paris', name: 'Paris' },
  { id: 'dubai', name: 'Dubai' },
  { id: 'tokyo', name: 'Tokyo' },
  { id: 'sydney', name: 'Sydney' },
];

export type Chapter = {
  title: string;
  note: string;
  href: string;
  /** Which small drawing sits beside it — see `components/sections/Contents.tsx`. */
  doodle: 'head' | 'notebook' | 'tangent';
};

export const chapters: Chapter[] = [
  {
    title: 'The founder',
    note: 'My journey',
    href: '/founder/',
    doodle: 'head',
  },
  {
    title: 'Notebook',
    note: 'Things I imagine',
    href: '/notebook/',
    doodle: 'notebook',
  },
  {
    title: 'Grasp',
    note: 'Learning calculus',
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
