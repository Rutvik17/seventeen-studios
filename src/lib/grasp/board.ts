/**
 * The lesson on the board.
 *
 * A chalkboard that teaches one thing — what a derivative is — by writing it out
 * the way it would actually be written out, and rubbing it off between steps.
 * Five acts, from "a function is a rule" to `f'(x) = 2x` derived from first
 * principles, and then the same result checked numerically.
 *
 * ---
 *
 * EVERY NUMBER ON THE BOARD IS COMPUTED
 *
 * Studio rule 7, and it matters more here than anywhere else on the site: this
 * is a page about a product whose entire claim is that it never shows a result
 * without the working. A chalkboard with `f(2) = 4` typed into a string would be
 * that claim failing on its own landing page.
 *
 * So `f(1)`, `f(2)`, `f(3)`, the rise, the run and the slope all come out of
 * `CURVES[0]` in `lib/calculus.ts` — the same function object the interactive
 * demonstration further down the page is dragging. The final check runs the
 * numeric derivative against the hand-differentiated one and prints the gap.
 * If the curve were changed, the board would follow it.
 *
 * ---
 *
 * WHY THE TEXT CARRIES `^` MARKERS
 *
 * Handwriting faces have thin coverage outside the basic latin set, and a
 * missing glyph does not fail loudly — the browser silently substitutes another
 * font for that one character, so `x²` arrives as a handwritten x followed by a
 * typeset 2. Exponents are therefore written `x^2` and turned into a raised
 * `<tspan>` by the renderer, which is both font-independent and closer to how
 * the character is actually formed by hand.
 */

import { CURVES, derivativeAt, fixed, sample } from '@/lib/calculus';

/* ------------------------------------------------------------------ *
 * The board, and the graph drawn on it
 * ------------------------------------------------------------------ */

export const BOARD = { width: 1600, height: 900 } as const;

/** Where the graph lives. The writing takes the left of the board. */
const PLOT = {
  x: 910,
  y: 130,
  w: 590,
  h: 620,
  domain: [-0.6, 3.6] as [number, number],
  range: [-1.6, 10.4] as [number, number],
};

const toX = (x: number): number =>
  PLOT.x + ((x - PLOT.domain[0]) / (PLOT.domain[1] - PLOT.domain[0])) * PLOT.w;

const toY = (y: number): number =>
  PLOT.y + PLOT.h - ((y - PLOT.range[0]) / (PLOT.range[1] - PLOT.range[0])) * PLOT.h;

/** The subject of the lesson: f(x) = x², straight out of the demo's own table. */
const SQUARE = CURVES[0];
const f = SQUARE.f;

/* ------------------------------------------------------------------ *
 * The arithmetic, done once
 * ------------------------------------------------------------------ */

const F1 = f(1);
const F2 = f(2);
const F3 = f(3);

/** The secant between x = 1 and x = 2, which is the first slope a learner meets. */
const RISE = F2 - F1;
const RUN = 2 - 1;
const SECANT = RISE / RUN;

/** The check at the end: the rule, against a finite difference. */
const CHECK_X = 3;
const EXACT_AT_3 = SQUARE.exact(CHECK_X);
const NUMERIC_AT_3 = derivativeAt(f, CHECK_X);
const GAP = Math.abs(NUMERIC_AT_3 - EXACT_AT_3);

export const LESSON = {
  f1: F1,
  f2: F2,
  f3: F3,
  rise: RISE,
  run: RUN,
  secant: SECANT,
  checkX: CHECK_X,
  exactAt3: EXACT_AT_3,
  numericAt3: NUMERIC_AT_3,
  gap: GAP,
} as const;

/* ------------------------------------------------------------------ *
 * Marks
 * ------------------------------------------------------------------ */

export type Ink = 'chalk' | 'accent' | 'dim';

/** A line of handwriting. `at` is its place in the act, 0..1. */
export type Write = {
  text: string;
  x: number;
  y: number;
  size: number;
  ink?: Ink;
  at: number;
};

/** A drawn mark: axes, curves, construction lines. Revealed by drawing it. */
export type Stroke = {
  d: string;
  at: number;
  width?: number;
  ink?: Ink;
  /** Dashed, for construction lines that are not part of the answer. */
  dashed?: boolean;
};

/** A plotted point, with an optional label beside it. */
export type Mark = {
  cx: number;
  cy: number;
  at: number;
  label?: string;
  ink?: Ink;
};

export type Act = {
  id: string;
  /** The one line said out loud, over the board. Everything else is written. */
  caption: string;
  writes: Write[];
  strokes: Stroke[];
  marks: Mark[];
};

/* ------------------------------------------------------------------ *
 * Pieces the acts share
 * ------------------------------------------------------------------ */

const axes = (at: number): Stroke[] => [
  {
    d: `M ${toX(PLOT.domain[0])} ${toY(0)} L ${toX(PLOT.domain[1])} ${toY(0)}`,
    at,
    width: 3,
  },
  {
    d: `M ${toX(0)} ${toY(PLOT.range[1])} L ${toX(0)} ${toY(PLOT.range[0])}`,
    at,
    width: 3,
  },
];

/** f(x) = x², plotted across the visible domain. */
const curvePath = (from = PLOT.domain[0], to = PLOT.domain[1]): string =>
  sample(f, [from, to], 90)
    .map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${toX(x).toFixed(1)} ${toY(y).toFixed(1)}`)
    .join(' ');

/** A straight line through (x0,y0) with the given slope, spanning ±span in x. */
const lineAt = (x0: number, y0: number, slope: number, span: number): string => {
  const a = x0 - span;
  const b = x0 + span;
  return `M ${toX(a)} ${toY(y0 - slope * span)} L ${toX(b)} ${toY(y0 + slope * span)}`;
};

/* ------------------------------------------------------------------ *
 * The lesson
 * ------------------------------------------------------------------ */

export const ACTS: Act[] = [
  /* ---------------------------------------------------------------- *
     1 — A function is a rule you can run.
     Three inputs, three outputs, and the line that makes the pairs into
     points. Nothing about slope yet.
   * ---------------------------------------------------------------- */
  {
    id: 'rule',
    caption: 'A function is a rule.',
    writes: [
      { text: 'f(x) = x^2', x: 120, y: 210, size: 82, at: 0.02 },
      { text: `f(1) = 1 × 1 = ${LESSON.f1}`, x: 130, y: 340, size: 46, at: 0.22 },
      { text: `f(2) = 2 × 2 = ${LESSON.f2}`, x: 130, y: 410, size: 46, at: 0.3 },
      { text: `f(3) = 3 × 3 = ${LESSON.f3}`, x: 130, y: 480, size: 46, at: 0.38 },
      {
        text: 'every pair is a point',
        x: 130,
        y: 600,
        size: 38,
        ink: 'dim',
        at: 0.6,
      },
    ],
    strokes: axes(0.12),
    marks: [
      { cx: toX(1), cy: toY(F1), at: 0.5, label: '(1, 1)' },
      { cx: toX(2), cy: toY(F2), at: 0.56, label: '(2, 4)' },
      { cx: toX(3), cy: toY(F3), at: 0.62, label: '(3, 9)' },
    ],
  },

  /* ---------------------------------------------------------------- *
     2 — Steepness is rise over run.
     The curve arrives, and the first slope anyone can actually measure:
     between two points that are far apart.
   * ---------------------------------------------------------------- */
  {
    id: 'steepness',
    caption: 'Steepness is rise over run.',
    writes: [
      { text: 'steepness = rise ÷ run', x: 120, y: 200, size: 56, at: 0.04 },
      { text: `rise = ${LESSON.f2} − ${LESSON.f1} = ${LESSON.rise}`, x: 130, y: 330, size: 46, at: 0.34 },
      { text: `run = 2 − 1 = ${LESSON.run}`, x: 130, y: 400, size: 46, at: 0.42 },
      {
        text: `${LESSON.rise} ÷ ${LESSON.run} = ${LESSON.secant}`,
        x: 130,
        y: 510,
        size: 64,
        ink: 'accent',
        at: 0.56,
      },
      {
        text: 'but that is the average, not the slope AT a point',
        x: 130,
        y: 620,
        size: 34,
        ink: 'dim',
        at: 0.76,
      },
    ],
    strokes: [
      ...axes(0),
      { d: curvePath(), at: 0.1, width: 4 },
      // The secant through the two points, extended a little past both.
      {
        d: `M ${toX(0.6)} ${toY(F1 + SECANT * (0.6 - 1))} L ${toX(2.5)} ${toY(F1 + SECANT * (2.5 - 1))}`,
        at: 0.24,
        width: 3,
        ink: 'accent',
      },
      // The rise/run triangle under it.
      {
        d: `M ${toX(1)} ${toY(F1)} L ${toX(2)} ${toY(F1)} L ${toX(2)} ${toY(F2)}`,
        at: 0.3,
        width: 2.5,
        dashed: true,
      },
    ],
    marks: [
      { cx: toX(1), cy: toY(F1), at: 0.16 },
      { cx: toX(2), cy: toY(F2), at: 0.16 },
    ],
  },

  /* ---------------------------------------------------------------- *
     3 — Close the gap.
     The second point slides down to the first and the secant becomes the
     tangent. This is the idea the whole subject rests on, and it is the
     one that has to be watched rather than read.
   * ---------------------------------------------------------------- */
  {
    id: 'limit',
    caption: 'Bring the two points together.',
    writes: [
      { text: 'slide the second point in', x: 120, y: 195, size: 46, at: 0.04 },
      {
        text: 'slope = [ f(x+h) − f(x) ] ÷ h',
        x: 120,
        y: 330,
        size: 52,
        at: 0.3,
      },
      { text: 'h is the gap between them', x: 130, y: 410, size: 34, ink: 'dim', at: 0.44 },
      { text: 'let h → 0', x: 130, y: 540, size: 64, ink: 'accent', at: 0.62 },
      {
        text: 'the secant becomes the tangent',
        x: 130,
        y: 640,
        size: 34,
        ink: 'dim',
        at: 0.8,
      },
    ],
    strokes: [
      ...axes(0),
      { d: curvePath(), at: 0, width: 4 },
      /*
        The secant is drawn at h = 1 and the tangent at h = 0, stacked. The
        renderer cross-fades between them as the act runs, which is the closest
        a scrubbed timeline gets to the point actually sliding — and it is the
        only moment on the board where something MOVES rather than appears.
      */
      {
        d: `M ${toX(0.6)} ${toY(F1 + SECANT * (0.6 - 1))} L ${toX(2.5)} ${toY(F1 + SECANT * (2.5 - 1))}`,
        at: 0.1,
        width: 3,
        dashed: true,
      },
      {
        d: lineAt(1, F1, SQUARE.exact(1), 1.3),
        at: 0.62,
        width: 4,
        ink: 'accent',
      },
    ],
    marks: [{ cx: toX(1), cy: toY(F1), at: 0.08 }],
  },

  /* ---------------------------------------------------------------- *
     4 — Do it properly.
     The whole derivation, written out. No shortcuts and no rule quoted
     from anywhere: expand, subtract, divide, and let h go.
   * ---------------------------------------------------------------- */
  {
    id: 'derive',
    caption: 'Now do it with algebra, once.',
    writes: [
      { text: 'f(x) = x^2', x: 120, y: 165, size: 52, at: 0.02 },
      { text: 'f(x + h) = (x + h)^2', x: 120, y: 255, size: 52, at: 0.14 },
      { text: '= x^2 + 2xh + h^2', x: 300, y: 335, size: 52, at: 0.26 },
      {
        text: 'f(x+h) − f(x) = 2xh + h^2',
        x: 120,
        y: 445,
        size: 52,
        at: 0.4,
      },
      {
        text: '( 2xh + h^2 ) ÷ h = 2x + h',
        x: 120,
        y: 535,
        size: 52,
        at: 0.54,
      },
      { text: 'let h → 0', x: 120, y: 630, size: 46, ink: 'dim', at: 0.68 },
      { text: "f'(x) = 2x", x: 150, y: 760, size: 90, ink: 'accent', at: 0.8 },
    ],
    strokes: [
      // The box round the answer, drawn last, the way you would underline it.
      {
        d: 'M 110 700 L 620 700 L 620 800 L 110 800 Z',
        at: 0.9,
        width: 4,
        ink: 'accent',
      },
      ...axes(0.04).map((s) => ({ ...s, ink: 'dim' as Ink })),
      { d: curvePath(), at: 0.08, width: 3, ink: 'dim' },
      { d: lineAt(1, F1, SQUARE.exact(1), 1.3), at: 0.2, width: 3, ink: 'dim' },
      { d: lineAt(2, F2, SQUARE.exact(2), 1.1), at: 0.5, width: 3, ink: 'dim' },
      { d: lineAt(3, F3, SQUARE.exact(3), 0.9), at: 0.7, width: 3, ink: 'dim' },
    ],
    marks: [
      { cx: toX(1), cy: toY(F1), at: 0.2, ink: 'dim' },
      { cx: toX(2), cy: toY(F2), at: 0.5, ink: 'dim' },
      { cx: toX(3), cy: toY(F3), at: 0.7, ink: 'dim' },
    ],
  },

  /* ---------------------------------------------------------------- *
     5 — Check it, and see what it is.
     The rule is tested against a finite difference — the same check the
     demonstration below the board runs while you drag it — and then the
     slopes are plotted, which is the reveal the product is built around.
   * ---------------------------------------------------------------- */
  {
    id: 'check',
    caption: 'Check it. Then look at what the slopes make.',
    writes: [
      {
        text: `f'(${LESSON.checkX}) = 2 × ${LESSON.checkX} = ${LESSON.exactAt3}`,
        x: 120,
        y: 210,
        size: 62,
        at: 0.04,
      },
      {
        text: 'measured on the curve:',
        x: 130,
        y: 320,
        size: 34,
        ink: 'dim',
        at: 0.24,
      },
      {
        text: `${fixed(LESSON.numericAt3, 6)}`,
        x: 130,
        y: 400,
        size: 56,
        at: 0.34,
      },
      {
        /*
          The gap between the rule and the measurement is around 1e−12 — real,
          and far below anything worth printing. Written out to six decimals it
          reads "off by 0.000000", which looks like a placeholder rather than a
          result. Stating the bound is both true and legible.
        */
        text:
          LESSON.gap < 1e-6
            ? 'difference below 0.000001'
            : `difference ${fixed(LESSON.gap, 6)}`,
        x: 130,
        y: 480,
        size: 34,
        ink: 'dim',
        at: 0.46,
      },
      {
        text: 'the slope at every point',
        x: 130,
        y: 620,
        size: 46,
        at: 0.62,
      },
      {
        text: 'is a curve of its own',
        x: 130,
        y: 690,
        size: 46,
        ink: 'accent',
        at: 0.72,
      },
    ],
    strokes: [
      ...axes(0),
      { d: curvePath(), at: 0, width: 4, ink: 'dim' },
      { d: lineAt(3, F3, SQUARE.exact(3), 0.8), at: 0.14, width: 3 },
      // f'(x) = 2x, plotted over the same axes. The reveal.
      {
        d: sample(SQUARE.exact, [PLOT.domain[0], PLOT.domain[1]], 60)
          .map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${toX(x).toFixed(1)} ${toY(y).toFixed(1)}`)
          .join(' '),
        at: 0.7,
        width: 5,
        ink: 'accent',
      },
    ],
    marks: [{ cx: toX(3), cy: toY(F3), at: 0.12 }],
  },
];
