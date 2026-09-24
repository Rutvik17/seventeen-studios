/**
 * The mark: seventeen, as a number, handwritten — two strokes of crayon, the 1
 * in the blue and the 7 in the marigold, the two crayons the cover's title is
 * written in. The nav carries it, the loader writes it, the tab shows it.
 *
 * DRAWN, NOT SET
 *
 * The numerals are paths rather than `<text>`, which matters for a mark: text
 * depends on a webfont that may not have loaded, renders differently on a
 * machine that substitutes, and would not match the favicon — which cannot use
 * a webfont at all. Paths are the same two shapes everywhere, forever.
 *
 * They are the line a hand takes, not an outline: each is stroked, round at
 * the ends, `MARK_STROKE` wide — so the loader can write them by drawing the
 * stroke along its length, and the pencil it draws with can follow the same
 * path.
 *
 * The favicon at `src/app/icon.svg` carries THESE SAME TWO PATHS on a tile,
 * because a tab needs a shape to sit in. If one changes, change both — the
 * numerals are duplicated there deliberately, since Next reads that file
 * statically and cannot import from here.
 */

/** Cap height about 23, total width 36. Baseline near y = 24. */
export const LOGO_VIEWBOX = '0 0 36 26';

/** The 1: a flick up to the top, then the stem down, leaning a little. */
export const LOGO_ONE = 'M4.6 8.4C6.9 6.8 9 4.6 10.9 1.9C10.5 9.6 10.1 17.2 9.5 24.2';

/** The 7: the bar across, then the long stroke down to the baseline. */
export const LOGO_SEVEN = 'M16.4 3.8C20.6 2.8 26.2 2.3 32.8 2.2C30.6 8.6 27 15.8 24 24.2';

/** How wide the crayon is, in the viewBox's units. */
export const MARK_STROKE = 3.3;
