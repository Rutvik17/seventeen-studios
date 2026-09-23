/**
 * The mark: seventeen, as a number — the two paths the nav's pencil-hatched
 * mark and the loader's drawing are both made from.
 *
 * DRAWN, NOT SET
 *
 * The numerals are paths rather than `<text>`, which matters for a mark: text
 * depends on a webfont that may not have loaded, renders differently on a
 * machine that substitutes, and would not match the favicon — which cannot use
 * a webfont at all. Paths are the same two shapes everywhere, forever.
 *
 * The favicon at `src/app/icon.svg` carries THESE SAME TWO PATHS on a tile,
 * because a tab needs a shape to sit in. If one changes, change both — the
 * numerals are duplicated there deliberately, since Next reads that file
 * statically and cannot import from here.
 */

/** Cap height 26, total width 36. Baseline at y = 26. */
export const LOGO_VIEWBOX = '0 0 36 26';

/** The 1: a full-height stem with a wedge flag on its upper left. */
export const LOGO_ONE = 'M13 0V26H6.5V6.5L1.5 9.5V3L7.5 0Z';

/** The 7: a top bar, and a diagonal falling from its right end to the baseline. */
export const LOGO_SEVEN = 'M19 0H36V5.5L27 26H20L29 6H19Z';
