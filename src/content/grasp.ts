/**
 * Grasp, as data.
 *
 * Grasp is a calculus course you learn by dragging, and it lives here, on this
 * site — it is no longer an app. The nine lessons of Module 1 are listed with
 * their titles; each carries a `web` flag for whether it can be done here yet,
 * and the page states plainly which can and which are still being built.
 *
 * A contents page that lists nine lessons as though they were all one tap away
 * would be the single most damaging thing this site could do: what you see
 * should be what has been built.
 */

import { spell } from '@/lib/time';

export type Lesson = {
  /** Two digits: 01, 02 … */
  index: string;
  title: string;
  /** True once the lesson has a working surface on the web. */
  web: boolean;
};

export const graspModule = {
  id: 'module01',
  title: 'Derivatives',
  /** Module 1 of eight. The rest is roadmap, and is not listed. */
  position: 'Module 1',
  lessons: [
    { index: '01', title: 'Steepness', web: false },
    { index: '02', title: "Curves don't have one steepness", web: false },
    { index: '03', title: 'Zoom in far enough and a curve is straight', web: false },
    { index: '04', title: 'The tangent line', web: false },
    { index: '05', title: 'Secant into tangent', web: false },
    { index: '06', title: 'The derivative is its own curve', web: false },
    { index: '07', title: 'Reading the signs', web: false },
    { index: '08', title: 'The power rule', web: false },
    { index: '09', title: 'Position becomes velocity', web: false },
  ] satisfies Lesson[],
} as const;

/** How many of the nine can actually be done here. Derived, never typed. */
export const graspInfo = {
  name: 'Grasp',
  tagline: 'Calculus you can touch',
  summary: `A calculus course you learn by dragging: ${spell(graspModule.lessons.length)} lessons, from the steepness of a line to velocity.`,
} as const;

export const onTheWeb = graspModule.lessons.filter((l) => l.web).length;
