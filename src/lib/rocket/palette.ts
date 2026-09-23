/**
 * The rocket drawings' coloured pencils.
 *
 * Declared once, as `--rocket-*` custom properties on the entry in
 * `RocketPhysics.module.css`, and read back here — the canvas cannot read CSS
 * any other way, and writing the colours down a second time is how the old
 * token mirror drifted (see CLAUDE.md). They colour the drawings and nothing
 * else on the site.
 */

export type Palette = {
  charcoal: string;
  muted: string;
  paper: string;
  /** The handwriting face's CSS font-family. */
  hand: string;
  sky: string;
  skyHigh: string;
  space: string;
  ocean: string;
  land: string;
  air: string;
  cloud: string;
  star: string;
  body: string;
  red: string;
  window: string;
  /** Nozzle, pad and gantry. */
  metal: string;
  flame: string;
  flameMid: string;
  flameCore: string;
  smoke: string;
  dust: string;
  push: string;
  pull: string;
  mark: string;
};

/** The custom property each colour is read from, on the entry's container. */
export const PALETTE_VARS: Record<Exclude<keyof Palette, 'hand' | 'charcoal' | 'muted' | 'paper'>, string> = {
  sky: '--rocket-sky',
  skyHigh: '--rocket-sky-high',
  space: '--rocket-space',
  ocean: '--rocket-ocean',
  land: '--rocket-land',
  air: '--rocket-air',
  cloud: '--rocket-cloud',
  star: '--rocket-star',
  body: '--rocket-body',
  red: '--rocket-red',
  window: '--rocket-window',
  metal: '--rocket-metal',
  flame: '--rocket-flame',
  flameMid: '--rocket-flame-mid',
  flameCore: '--rocket-flame-core',
  smoke: '--rocket-smoke',
  dust: '--rocket-dust',
  push: '--rocket-push',
  pull: '--rocket-pull',
  mark: '--rocket-mark',
};

/** The palette, read off the page: the entry's own colours, and the site's charcoal, muted, paper and handwriting. */
export function readPalette(entry: Element): Palette {
  const own = getComputedStyle(entry);
  const root = getComputedStyle(document.documentElement);
  const colours = Object.fromEntries(
    Object.entries(PALETTE_VARS).map(([key, name]) => [key, own.getPropertyValue(name).trim()]),
  ) as Record<keyof typeof PALETTE_VARS, string>;
  return {
    charcoal: root.getPropertyValue('--fg').trim(),
    muted: root.getPropertyValue('--muted').trim(),
    paper: root.getPropertyValue('--bg-raise').trim(),
    hand: root.getPropertyValue('--font-hand').trim() || 'cursive',
    ...colours,
  };
}
