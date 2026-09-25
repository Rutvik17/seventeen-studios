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


import { founder } from './founder';

export const site = {
  name: 'Seventeen Studios',
  description: `The sketchbook of ${founder.name}, ${founder.title} at ${founder.employer}, ${founder.focus}.`,
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
  { label: 'Algorithms', href: '/algorithms/' },
  { label: 'Grasp', href: '/grasp/' },
  { label: 'Founder', href: '/founder/' },
] as const;

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
