/**
 * A 5 × 7 bitmap font.
 *
 * ---
 *
 * WHY A BITMAP FONT AND NOT `fillText`
 *
 * Two reasons, and both matter.
 *
 * The first is honesty. A microcontroller driving a small e-ink panel has no
 * font engine, no hinting and no subpixel anything — it has an array of bytes
 * and a loop that sets pixels. Rendering the panel with the browser's text
 * engine and then quantising the result produces something no such device could
 * ever display, which quietly turns the whole drawing into an illustration of a
 * product rather than a specification of one.
 *
 * The second is control. Anti-aliased glyphs pushed through a hard threshold
 * come apart: thin stems drop below the cut and vanish, and letters that survive
 * at one size disappear at another. Characters were rendering incorrectly for
 * exactly this reason. A bitmap font has no grey to threshold — every pixel is
 * decided when the glyph is authored, so what is drawn is what appears, at every
 * size, forever.
 *
 * ---
 *
 * THE FORMAT
 *
 * Seven rows of five characters. `#` is ink, anything else is paper. Authored as
 * strings rather than packed hex because a glyph you can read in the source is a
 * glyph you can fix; the packing that a firmware build would do is a build step,
 * not a source format.
 *
 * 5 × 7 is the classic small-display cell — it is the smallest grid on which
 * every letter of the alphabet stays distinguishable, which is why it has been
 * the default on segment and dot-matrix displays for forty years.
 */

const GLYPHS: Record<string, string[]> = {
  A: ['.###.', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  B: ['####.', '#...#', '####.', '#...#', '#...#', '#...#', '####.'],
  C: ['.###.', '#...#', '#....', '#....', '#....', '#...#', '.###.'],
  D: ['####.', '#...#', '#...#', '#...#', '#...#', '#...#', '####.'],
  E: ['#####', '#....', '####.', '#....', '#....', '#....', '#####'],
  F: ['#####', '#....', '####.', '#....', '#....', '#....', '#....'],
  G: ['.###.', '#...#', '#....', '#.###', '#...#', '#...#', '.###.'],
  H: ['#...#', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  I: ['.###.', '..#..', '..#..', '..#..', '..#..', '..#..', '.###.'],
  J: ['..###', '...#.', '...#.', '...#.', '...#.', '#..#.', '.##..'],
  K: ['#...#', '#..#.', '#.#..', '##...', '#.#..', '#..#.', '#...#'],
  L: ['#....', '#....', '#....', '#....', '#....', '#....', '#####'],
  M: ['#...#', '##.##', '#.#.#', '#.#.#', '#...#', '#...#', '#...#'],
  N: ['#...#', '##..#', '#.#.#', '#..##', '#...#', '#...#', '#...#'],
  O: ['.###.', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  P: ['####.', '#...#', '#...#', '####.', '#....', '#....', '#....'],
  Q: ['.###.', '#...#', '#...#', '#...#', '#.#.#', '#..#.', '.##.#'],
  R: ['####.', '#...#', '#...#', '####.', '#.#..', '#..#.', '#...#'],
  S: ['.####', '#....', '#....', '.###.', '....#', '....#', '####.'],
  T: ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '..#..'],
  U: ['#...#', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  V: ['#...#', '#...#', '#...#', '#...#', '#...#', '.#.#.', '..#..'],
  W: ['#...#', '#...#', '#...#', '#.#.#', '#.#.#', '##.##', '#...#'],
  X: ['#...#', '#...#', '.#.#.', '..#..', '.#.#.', '#...#', '#...#'],
  Y: ['#...#', '#...#', '.#.#.', '..#..', '..#..', '..#..', '..#..'],
  Z: ['#####', '....#', '...#.', '..#..', '.#...', '#....', '#####'],

  '0': ['.###.', '#...#', '#..##', '#.#.#', '##..#', '#...#', '.###.'],
  '1': ['..#..', '.##..', '..#..', '..#..', '..#..', '..#..', '.###.'],
  '2': ['.###.', '#...#', '....#', '...#.', '..#..', '.#...', '#####'],
  '3': ['#####', '...#.', '..#..', '...#.', '....#', '#...#', '.###.'],
  '4': ['...#.', '..##.', '.#.#.', '#..#.', '#####', '...#.', '...#.'],
  '5': ['#####', '#....', '####.', '....#', '....#', '#...#', '.###.'],
  '6': ['..##.', '.#...', '#....', '####.', '#...#', '#...#', '.###.'],
  '7': ['#####', '....#', '...#.', '..#..', '.#...', '.#...', '.#...'],
  '8': ['.###.', '#...#', '#...#', '.###.', '#...#', '#...#', '.###.'],
  '9': ['.###.', '#...#', '#...#', '.####', '....#', '...#.', '.##..'],

  '.': ['.....', '.....', '.....', '.....', '.....', '.##..', '.##..'],
  ',': ['.....', '.....', '.....', '.....', '.##..', '.##..', '.#...'],
  ':': ['.....', '.##..', '.##..', '.....', '.##..', '.##..', '.....'],
  '-': ['.....', '.....', '.....', '#####', '.....', '.....', '.....'],
  '+': ['.....', '..#..', '..#..', '#####', '..#..', '..#..', '.....'],
  '/': ['....#', '....#', '...#.', '..#..', '.#...', '#....', '#....'],
  '%': ['##..#', '##..#', '...#.', '..#..', '.#...', '#..##', '#..##'],
  $: ['..#..', '.####', '#.#..', '.###.', '..#.#', '####.', '..#..'],
  '·': ['.....', '.....', '.....', '.##..', '.##..', '.....', '.....'],
  '°': ['.##..', '#..#.', '#..#.', '.##..', '.....', '.....', '.....'],
  '(': ['..#..', '.#...', '#....', '#....', '#....', '.#...', '..#..'],
  ')': ['..#..', '...#.', '....#', '....#', '....#', '...#.', '..#..'],
  '↑': ['..#..', '.###.', '#.#.#', '..#..', '..#..', '..#..', '..#..'],
  '↓': ['..#..', '..#..', '..#..', '..#..', '#.#.#', '.###.', '..#..'],
  ' ': ['.....', '.....', '.....', '.....', '.....', '.....', '.....'],
};

export const GLYPH_W = 5;
export const GLYPH_H = 7;
/** One blank column between glyphs — the cell is 6 wide in practice. */
export const TRACKING = 1;

export type Ink = 0 | 1 | 2; // 0 paper · 1 black · 2 accent

/**
 * A 1-bit bitmap the panel is composed into.
 *
 * A plain array of small integers rather than an ImageData: the shader wants
 * three discrete states, not RGBA, and keeping it symbolic means the quantising
 * happens once at author time rather than being inferred from colours later.
 */
export class Bitmap {
  readonly width: number;
  readonly height: number;
  readonly data: Uint8Array;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.data = new Uint8Array(width * height);
  }

  set(x: number, y: number, ink: Ink): void {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return;
    this.data[y * this.width + x] = ink;
  }

  get(x: number, y: number): number {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return 0;
    return this.data[y * this.width + x];
  }

  fillRect(x: number, y: number, w: number, h: number, ink: Ink): void {
    for (let j = 0; j < h; j++) {
      for (let i = 0; i < w; i++) this.set(x + i, y + j, ink);
    }
  }

  /**
   * Draw text, at an integer scale.
   *
   * Integer scale only, and that is the whole discipline of this file: a
   * fractional scale means a source pixel lands between destination pixels, and
   * the renderer either drops it or smears it. Both produce the broken glyphs
   * this replaced. Returns the x the next character would start at, so callers
   * can lay out a line without measuring twice.
   */
  text(x: number, y: number, str: string, ink: Ink, scale = 1): number {
    let cursor = x;
    for (const raw of str.toUpperCase()) {
      const glyph = GLYPHS[raw] ?? GLYPHS[' '];
      for (let row = 0; row < GLYPH_H; row++) {
        for (let col = 0; col < GLYPH_W; col++) {
          if (glyph[row][col] !== '#') continue;
          this.fillRect(cursor + col * scale, y + row * scale, scale, scale, ink);
        }
      }
      cursor += (GLYPH_W + TRACKING) * scale;
    }
    return cursor;
  }

  /** Width a string will occupy, so a line can be right-aligned or centred. */
  static measure(str: string, scale = 1): number {
    return str.length * (GLYPH_W + TRACKING) * scale - TRACKING * scale;
  }

  /**
   * The largest integer scale at which `str` fits within `maxWidth`.
   *
   * Integer steps only — a bitmap font at a fractional scale puts source pixels
   * between destination pixels and the glyph either loses rows or smears, which
   * is the whole failure this font exists to avoid. Better a line one step
   * smaller than a line that is subtly wrong.
   *
   * Falls back to 1 rather than 0, because a cramped line is recoverable and an
   * invisible one is not.
   */
  static fitScale(str: string, maxWidth: number, preferred: number): number {
    for (let scale = preferred; scale >= 1; scale--) {
      if (Bitmap.measure(str, scale) <= maxWidth) return scale;
    }
    return 1;
  }

  /**
   * Draw text at the largest scale that fits the width given.
   *
   * Used for anything whose length is not known in advance. A ticker is four or
   * five characters and a percentage is usually six — but "−100.00%" is eight,
   * and at the size the move is drawn that overruns the panel. Measuring first
   * costs nothing and removes the whole class of bug.
   */
  fitText(x: number, y: number, str: string, ink: Ink, preferred: number, maxWidth: number): number {
    return this.text(x, y, str, ink, Bitmap.fitScale(str, maxWidth, preferred));
  }
}
