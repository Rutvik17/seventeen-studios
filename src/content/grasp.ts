/**
 * Grasp's course, as data.
 *
 * The nine lessons of Module 1, with the titles they actually carry in the app
 * — taken from `src/lessons/module01/index.ts` in the Grasp repository, not
 * rewritten for the web. If a lesson is renamed there it should be renamed here,
 * and the two drifting apart is the only way this file can be wrong.
 *
 * ---
 *
 * NOTHING HERE CLAIMS TO BE PLAYABLE
 *
 * Studio rule 8. The lessons run on iOS today; the web versions are being
 * brought over one at a time, and the first piece of that work is the
 * interactive derivative on the landing page. So each lesson carries a `web`
 * flag and the page states plainly what is and is not here yet.
 *
 * A contents page that lists nine lessons as though they were all one tap away
 * would be the single most damaging thing this site could do: the whole
 * argument of the studio is that what you see is what has been built.
 */

export type Lesson = {
  /** Two digits, as the app numbers them. */
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
export const onTheWeb = graspModule.lessons.filter((l) => l.web).length;
