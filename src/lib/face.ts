/**
 * The companion's face.
 *
 * A 24 × 24 sprite composed from a fixed head and three swappable feature
 * layers: brows, eyes and mouth. An expression is a choice of three layers, not
 * a hand-drawn bitmap — which is how the firmware would store it too, since
 * five expressions as full sprites is five times the flash for no more range.
 *
 * ---
 *
 * WHY BROWS
 *
 * The previous face had eyes and a mouth and read as blank at every setting but
 * the extremes. Brows are what actually carry expression: the mouth says
 * pleased or displeased and the brows say how much, and without them a face has
 * two states wearing five labels.
 *
 * Raising the inner ends reads as worry, lowering them reads as determination,
 * and raising both together reads as surprise. Those three are most of what a
 * face does.
 *
 * ---
 *
 * WHY LAYERS AND NOT WHOLE SPRITES
 *
 * Composition also makes the expressions consistent. Hand-drawing five faces
 * puts the eyes a pixel apart between them, and the companion appears to twitch
 * as it changes mood. Layers land on the same rows every time.
 */

const W = 24;
const H = 24;

/** `.` leaves whatever is beneath · `#` is ink. Layers only ever add. */
type Layer = string[];

/*
  The head — an OUTLINE with a paper interior, not a solid shape.

  The first version drew a solid ink head and carved the features out of it as
  negative space. Eyes worked; brows could not, because a brow drawn in ink on
  an ink face is invisible, and carving one out reads as a gap rather than a
  line. That is why the earlier face had no brows and only two usable states.

  An outline gives features somewhere to be drawn. The bud on top is the
  antenna, which the board really has, and it gives the silhouette something
  asymmetric enough to read as a character rather than as a circle.
*/
const HEAD: Layer = [
  '........................',
  '..........####..........',
  '.........#....#.........',
  '.........#....#.........',
  '..........####..........',
  '...........##...........',
  '......############......',
  '....##............##....',
  '...#................#...',
  '..#..................#..',
  '..#..................#..',
  '.#....................#.',
  '.#....................#.',
  '.#....................#.',
  '.#....................#.',
  '.#....................#.',
  '.#....................#.',
  '.#....................#.',
  '..#..................#..',
  '..#..................#..',
  '...#................#...',
  '....##............##....',
  '......############......',
  '........................',
];

/*
  Features are drawn in INK on the paper interior. `.` leaves what is beneath,
  so a layer only ever adds — no layer can accidentally erase the head's own
  outline.
*/

const BROWS: Record<string, Layer> = {
  flat: [
    '........................',
    '.....#####....#####.....',
  ],
  raised: [
    '.....#####....#####.....',
    '........................',
  ],
  worried: [
    '.......###....###.......',
    '.....##..........##.....',
  ],
  angry: [
    '.....##..........##.....',
    '.......###....###.......',
  ],
};
/** The row the brow layer starts on. */
const BROW_ROW = 8;

const EYES: Record<string, Layer> = {
  open: [
    '......###......###......',
    '......###......###......',
    '......###......###......',
  ],
  wide: [
    '.....####......####.....',
    '.....####......####.....',
    '.....####......####.....',
  ],
  happy: [
    '.......#........#.......',
    '......#.#......#.#......',
    '........................',
  ],
  closed: [
    '........................',
    '......###......###......',
    '........................',
  ],
};
const EYE_ROW = 12;

const MOUTH: Record<string, Layer> = {
  grin: [
    '........########........',
    '.........######.........',
  ],
  smile: [
    '........#......#........',
    '.........######.........',
  ],
  flat: [
    '........########........',
    '........................',
  ],
  small: [
    '..........####..........',
    '........................',
  ],
  frown: [
    '.........######.........',
    '........#......#........',
  ],
};
const MOUTH_ROW = 17;

export type Expression =
  | 'delighted'
  | 'pleased'
  | 'neutral'
  | 'concerned'
  | 'alarmed'
  | 'asleep';

const FACES: Record<
  Expression,
  { brows: keyof typeof BROWS; eyes: keyof typeof EYES; mouth: keyof typeof MOUTH }
> = {
  delighted: { brows: 'raised', eyes: 'happy', mouth: 'grin' },
  pleased: { brows: 'flat', eyes: 'open', mouth: 'smile' },
  neutral: { brows: 'flat', eyes: 'open', mouth: 'flat' },
  concerned: { brows: 'worried', eyes: 'open', mouth: 'small' },
  alarmed: { brows: 'worried', eyes: 'wide', mouth: 'frown' },
  asleep: { brows: 'flat', eyes: 'closed', mouth: 'small' },
};

/*
  Every layer must be exactly the sprite's width, checked once at module load.
  A short row silently shifts every feature to its right by however many
  characters are missing, and the result is a face that is subtly wrong in a way
  that is very hard to see and very easy to introduce.
*/
for (const [name, layer] of Object.entries({ HEAD, ...BROWS, ...EYES, ...MOUTH })) {
  for (const row of layer as Layer) {
    if (row.length !== W) {
      throw new Error(`face layer "${name}" has a row of ${row.length}, expected ${W}`);
    }
  }
}

export type FaceCell = { x: number; y: number };

/** The inked cells of one expression. */
export function faceCells(expression: Expression): FaceCell[] {
  const face = FACES[expression] ?? FACES.neutral;
  const grid = HEAD.map((row) => row.split(''));

  const stamp = (layer: Layer, top: number) => {
    layer.forEach((row, j) => {
      const y = top + j;
      if (y < 0 || y >= H) return;
      for (let x = 0; x < W; x++) {
        // Only ink is written. A layer cannot erase, so no feature can eat
        // into the head's outline by being a character too wide.
        if (row[x] === '#') grid[y][x] = '#';
      }
    });
  };

  stamp(BROWS[face.brows], BROW_ROW);
  stamp(EYES[face.eyes], EYE_ROW);
  stamp(MOUTH[face.mouth], MOUTH_ROW);

  const cells: FaceCell[] = [];
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (grid[y][x] === '#') cells.push({ x, y });
    }
  }
  return cells;
}

export const FACE_SIZE = W;

/**
 * Map the model's percentile to an expression.
 *
 * The input is where today sits in the MODEL'S OWN output distribution, not a
 * raw probability. The model's predictions span about two percentage points, so
 * thresholds on the probability itself would leave the companion permanently
 * neutral; a percentile uses the whole range the model actually produces.
 *
 * Monotonic by construction — the thresholds only step one way — so a more
 * bearish reading can never produce a happier face. That is obvious and is the
 * easiest thing to break once thresholds are being tuned by eye.
 */
export function expressionFor(percentile: number, awake = true): Expression {
  if (!awake) return 'asleep';
  if (percentile >= 0.8) return 'delighted';
  if (percentile >= 0.6) return 'pleased';
  if (percentile >= 0.4) return 'neutral';
  if (percentile >= 0.2) return 'concerned';
  return 'alarmed';
}
