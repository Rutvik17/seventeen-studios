/**
 * The pixel companion that lives on the board's e-ink display.
 *
 * A 16 × 16 sprite drawn as a bitmap, because that is what actually ships to a
 * 1-bit panel. The face is composed from a fixed head outline plus swappable
 * eye and mouth rows, so an expression is a data change rather than a second
 * hand-drawn sprite — which is also how it would be stored in the firmware's
 * flash, where every byte is counted.
 *
 * ---
 *
 * WHY THREE COLOURS AND NOT GREYSCALE
 *
 * The panel this is drawn for is a three-colour e-ink — black, white and one
 * accent — which is a real and very common part. It cannot do grey at all, so
 * there is no anti-aliasing anywhere in this file and there must not be: every
 * pixel is one of three states. Rendering it with soft edges would be drawing a
 * display that does not exist.
 *
 * ---
 *
 * WHY THE EXPRESSION IS DRIVEN BY DATA
 *
 * The companion's whole point is that it is a readout you can feel something
 * about. It reads a market move, or a calendar, or the next bus, and its face
 * is the summary — you get the sign and the magnitude from across the room
 * without reading a number. The mapping is in `expressionFor`, and it is
 * deliberately monotonic: a worse number never produces a happier face.
 */

/** `.` white · `#` black · `+` the panel's accent ink. */
type Row = string;

const HEAD: Row[] = [
  '................',
  '....########....',
  '...#........#...',
  '..#..........#..',
  '.#............#.',
  '.#............#.',
  '.#............#.',
  '.#............#.',
  '.#............#.',
  '.#............#.',
  '..#..........#..',
  '...#........#...',
  '....########....',
  '......#..#......',
  '.....##..##.....',
  '................',
];

/** Rows 5 and 6 carry the eyes. */
const EYES: Record<string, [Row, Row]> = {
  open:    ['.#...##..##...#.', '.#...##..##...#.'],
  happy:   ['.#...##..##...#.', '.#..#..##..#..#.'],
  wide:    ['.#..###..###..#.', '.#..###..###..#.'],
  closed:  ['.#............#.', '.#..####..####.#'.slice(0, 16)],
  worried: ['.#..#.....#...#.', '.#...##..##...#.'],
};

/** Row 8 carries the mouth. */
const MOUTH: Record<string, Row> = {
  flat:  '.#....####....#.',
  smile: '.#...#....#...#.',
  grin:  '.#..#......#..#.',
  frown: '.#...######...#.',
  small: '.#.....##.....#.',
};

export type Expression =
  | 'delighted'
  | 'pleased'
  | 'neutral'
  | 'concerned'
  | 'alarmed'
  | 'asleep';

const FACES: Record<Expression, { eyes: keyof typeof EYES; mouth: keyof typeof MOUTH }> = {
  delighted: { eyes: 'happy', mouth: 'grin' },
  pleased: { eyes: 'open', mouth: 'smile' },
  neutral: { eyes: 'open', mouth: 'flat' },
  concerned: { eyes: 'worried', mouth: 'small' },
  alarmed: { eyes: 'wide', mouth: 'frown' },
  asleep: { eyes: 'closed', mouth: 'small' },
};

export type PixelCell = { x: number; y: number; ink: 'black' | 'accent' };

/**
 * Which of the panel's colours a mood should be drawn in.
 *
 * Red for a fall and green for a rise, because that is the convention every
 * reader of a market screen already has — and a convention the audience already
 * holds is worth more than any palette chosen for its own sake.
 */
export function inkFor(sigmas: number): 'green' | 'red' | 'black' {
  if (sigmas > 0.25) return 'green';
  if (sigmas < -0.25) return 'red';
  return 'black';
}

/**
 * The sprite for an expression, as cells.
 *
 * Returns only the cells that are inked. A 16 × 16 face is 256 cells of which
 * roughly sixty are on, so emitting the blanks would triple the DOM for
 * nothing — and on a white panel a white pixel is the absence of ink, not a
 * white rectangle.
 */
export function faceCells(expression: Expression, accentRows: number[] = []): PixelCell[] {
  const face = FACES[expression];
  const rows = [...HEAD];
  const [e1, e2] = EYES[face.eyes];
  rows[5] = e1;
  rows[6] = e2;
  rows[8] = MOUTH[face.mouth];

  const cells: PixelCell[] = [];
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const ch = row[x];
      if (ch === '#') {
        cells.push({ x, y, ink: accentRows.includes(y) ? 'accent' : 'black' });
      } else if (ch === '+') {
        cells.push({ x, y, ink: 'accent' });
      }
    }
  });
  return cells;
}

/**
 * Map a signed magnitude to a face.
 *
 * Monotonic by construction — the thresholds only ever step one way — so a
 * worse reading can never produce a happier companion. That sounds obvious and
 * is the single easiest thing to get wrong once the thresholds are being tuned
 * by eye against live data.
 *
 * `value` is a percentage change; the bands are roughly one daily sigma for a
 * large-cap equity, which is why ±1% is barely a reaction and ±4% is not.
 */
export function expressionFor(value: number, awake = true): Expression {
  if (!awake) return 'asleep';
  if (value >= 4) return 'delighted';
  if (value >= 1) return 'pleased';
  if (value > -1) return 'neutral';
  if (value > -4) return 'concerned';
  return 'alarmed';
}

/**
 * Display geometry — a real 4.01" seven-colour ACeP module.
 *
 * ---
 *
 * WHY THIS PART AND NOT THE 2.9" IT REPLACED
 *
 * A market readout wants red for down and green for up, and a three-colour
 * panel physically cannot do that: it holds black pigment, white pigment and
 * ONE accent. Red or yellow, never both, and never green. Colouring a fall red
 * and a rise green on such a panel would be drawing a device that cannot exist.
 *
 * ACeP — Advanced Color ePaper — stacks pigments of several colours in each
 * capsule and drives them out selectively, which gives seven. It is a real,
 * purchasable part and it is the honest way to get the readout that was asked
 * for.
 *
 * ---
 *
 * WHAT IT COSTS, STATED PLAINLY
 *
 * It is very slow: a full refresh is around thirty seconds against fifteen for
 * the three-colour panel, because every pigment has to be driven to its own
 * position in turn. There is no partial refresh at all. And the colours are
 * muted — the pigments are not dyes and cannot be saturated — so the palette
 * below is deliberately desaturated rather than screen-bright.
 *
 * That suits this device exactly. It changes a few times an hour and is read
 * from across a room.
 */
export const PANEL = {
  width: 640,
  height: 400,
  /** Active area, mm. */
  mmWidth: 81.6,
  mmHeight: 51.0,
  /** The module including its bezel, mm. */
  moduleWidth: 91.0,
  moduleHeight: 60.4,
  /**
   * Full-refresh time in seconds.
   *
   * Not a guess. Every pigment has to be driven to position in sequence, and
   * the panel flashes through its whole palette while it works. It is the reason
   * these are used for things that change hourly and never for anything
   * interactive — and the page says so rather than animating a refresh that
   * would be dishonest.
   */
  refreshSeconds: 30,
} as const;
