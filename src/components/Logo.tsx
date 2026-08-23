/**
 * The mark: seventeen, as a number.
 *
 * The header used to set the word SEVENTEEN in the display face. That is a
 * WORDMARK, not a logo — it is the name typed out, it is a hundred and thirty
 * pixels of it, and it says the same thing the giant one in the footer already
 * says. This is the actual mark, and it is the same one in the browser tab.
 *
 * ---
 *
 * DRAWN, NOT SET
 *
 * The numerals are paths rather than `<text>`, which matters for a mark: text
 * depends on a webfont that may not have loaded, renders differently on a
 * machine that substitutes, and would not match the favicon — which cannot use
 * a webfont at all. Paths are the same two shapes everywhere, forever.
 *
 * `currentColor`, so the header's hover state and any future dark surface get
 * it for free rather than needing a second copy of the mark.
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

export function Logo({ className }: { className?: string }) {
  return (
    <svg
      viewBox={LOGO_VIEWBOX}
      className={className}
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
    >
      <path d={LOGO_ONE} />
      <path d={LOGO_SEVEN} />
    </svg>
  );
}
