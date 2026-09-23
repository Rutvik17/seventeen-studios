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
    'Seventeen Studios is Rutvik Patel’s engineering portfolio — interactive instruments, simulations, and software built to be taken apart.',
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
 * The first screen is two double pendulums diverging, and a readout that shows
 * the working. The copy labels it; it does not explain it — each figure gets
 * one plain line saying what it measures, because "energy error" means nothing
 * to someone who has not met an integrator.
 */
export const hero = {
  wordmarkTop: 'SEVENTEEN',
  wordmarkBottom: 'STUDIOS',
  eyebrow: 'Rutvik Patel — software engineer, Toronto',
  line: 'Things I build, with the working left in.',
  cursor: 'Drag',
  hint: 'Drag the tip, or tap, to release them from somewhere else',
  hintStatic: 'Tap to release them from somewhere else',
  readout: {
    time: 'Simulated seconds since release.',
    gap: 'Distance between the two tips, on arms a metre long.',
    doubling: 'Measured, not assumed: fitted to how fast the gap grew while it was under a centimetre.',
    drift: 'Without friction this must stay zero. What is left is rounding in the integrator.',
  },
} as const;

/** Marquee strip. Nouns, not adjectives. */
export const marqueeItems = [
  'Interactive Instruments',
  'Quantitative Modelling',
  'Simulation',
  'WebGL & Canvas',
  'React · TypeScript',
  'Design Systems',
  'Realtime Data',
  'Teaching Tools',
] as const;
