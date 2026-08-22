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
  social: [
    { label: 'GitHub', href: 'https://github.com/rutvik17' },
    { label: 'LinkedIn', href: 'https://www.linkedin.com/' },
    /* `contact` marks the row that must render through <ContactLink>. */
    { label: 'Email', href: '/start/', contact: true },
  ],
} as const;

export const nav = [
  { label: 'Notebook', href: '/notebook/' },
  { label: 'Lab', href: '/lab/' },
  { label: 'Grasp', href: '/products/grasp/' },
  { label: 'Rutvik', href: '/founder/' },
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

/**
 * The first-load sequence: the board coming up.
 *
 * ---
 *
 * WHY A BOOT LOG
 *
 * The landing page opens by assembling a circuit board, so the loader is that
 * board being powered on — the same object, one moment earlier. What was here
 * was four abstract nouns cycling over a progress bar, which said nothing and
 * connected to nothing that followed it.
 *
 * The lines are stylised but not invented. An ESP32-C3 really does print a reset
 * reason and a ROM banner to its serial port at power-on, and the rail, the
 * crystal, the flash and the panel are the actual peripherals on this board,
 * checked in the order firmware would bring them up. The figures come from the
 * same design data the landing page is drawn from.
 *
 * `at` is a fraction of the load window rather than a delay in seconds, so the
 * sequence stretches or compresses with the window instead of finishing before
 * the page is ready or running on after it.
 */
export const preloader = {
  status: 'Bringing up the board',
  lines: [
    { at: 0.0, label: 'rst:0x1 (poweron)', value: '' },
    { at: 0.12, label: 'esp32c3 rom', value: 'v1.1' },
    { at: 0.3, label: '3v3 rail', value: '3.31 v' },
    { at: 0.48, label: 'xtal 32.768 khz', value: 'lock' },
    { at: 0.62, label: 'flash 4 mb', value: 'ok' },
    { at: 0.78, label: 'epd 640x400 acep', value: 'ready' },
  ],
} as const;

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
