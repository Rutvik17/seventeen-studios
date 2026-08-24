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

import { foundedYear } from '@/lib/time';
import { resumeHeader } from './resume';

export const site = {
  name: 'Seventeen Studios',
  wordmark: 'SEVENTEEN',
  wordmarkSecond: 'STUDIOS',
  tagline: 'The engineering notebook of Rutvik Patel.',
  description:
    'Seventeen Studios is Rutvik Patel’s engineering portfolio — interactive instruments, custom hardware, and software built to be taken apart.',
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
    Built from the résumé's header rather than written out again here.

    The LinkedIn row pointed at `https://www.linkedin.com/` — the site's front
    door, not a profile — so every "LinkedIn" link on this site, in the footer
    and in the menu, sent a hiring manager to a logged-out homepage. The correct
    handle was in `resume.ts` the whole time, which is exactly the shape of
    failure that comes from holding the same fact in two places.

    So there is one place now. `resumeHeader` is the canonical contact record —
    it is what the generated PDF and DOCX print — and these are the same values
    with a scheme on the front.
  */
  social: [
    { label: 'GitHub', href: `https://${resumeHeader.github}` },
    { label: 'LinkedIn', href: `https://${resumeHeader.linkedin}` },
    /* `contact` marks the row that must render through <ContactLink>. */
    { label: 'Email', href: '/start/', contact: true },
  ],
} as const;

export const nav = [
  { label: 'Notebook', href: '/notebook/' },
  { label: 'Lab', href: '/lab/' },
  { label: 'Grasp', href: '/products/grasp/' },
  { label: 'Founder', href: '/founder/' },
  { label: 'Contact', href: '/start/' },
] as const;

/**
 * The landing.
 *
 * Six words of copy on the whole first screen. The board assembling behind them
 * is the argument; a paragraph next to it would only be an apology for the
 * board not being clear enough.
 */
export const hero = {
  wordmarkTop: 'SEVENTEEN',
  wordmarkBottom: 'STUDIOS',
  eyebrow: 'Rutvik Patel — software engineer, Toronto',
  line: 'Things I build, with the working left in.',
} as const;

/**
 * The board story's five acts.
 *
 * The captions are the only text on the landing and each is under nine words,
 * because they are read at a glance while something is moving.
 */
export const boardActs = [
  {
    index: '01',
    title: 'Substrate',
    caption: 'Two layers of copper on 1.6 mm FR-4.',
  },
  {
    index: '02',
    title: 'Placement',
    caption: 'Real footprints, to the tenth of a millimetre.',
  },
  {
    index: '03',
    title: 'Routing',
    caption: 'Forty-five degrees only. Width from IPC-2221.',
  },
  {
    index: '04',
    title: 'Power',
    caption: 'Regulated to 3.3 V. The crystal starts.',
  },
  {
    index: '05',
    title: 'Awake',
    caption: 'A companion on e-ink, fed by live data.',
  },
] as const;

/** Marquee strip. Nouns, not adjectives. */
export const marqueeItems = [
  'Interactive Instruments',
  'Quantitative Modelling',
  'Embedded Hardware',
  'WebGL & Canvas',
  'React · TypeScript',
  'Design Systems',
  'Realtime Data',
  'Teaching Tools',
] as const;
