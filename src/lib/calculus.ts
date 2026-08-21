/**
 * The mathematics behind the Grasp demonstration.
 *
 * Small on purpose. This is the web page's version of what the app does on a
 * phone: hold a point on a curve, read the slope there, and watch the collected
 * slopes turn out to be a curve of their own.
 *
 * ---
 *
 * WHY EVERY FUNCTION CARRIES ITS EXACT DERIVATIVE
 *
 * The app computes derivatives numerically — a central difference, because a
 * computer algebra system is a great deal of machinery for a teaching tool that
 * never needs to print a symbolic answer. Numerically is also how you get a
 * derivative for a function a learner typed in.
 *
 * But a demonstration that only shows the numeric answer asks to be trusted.
 * Every function here therefore ships the hand-differentiated form beside it, so
 * the page can print both and the error between them. The reader watches a
 * finite difference agree with calculus to six decimals while they drag — which
 * is the entire claim the product makes about itself, made checkable in the one
 * place a sceptical reader is standing.
 *
 * It is the same device as the analytic cross-check in `lib/quant.ts`, and for
 * the same reason: a number you can verify is worth more than a number you are
 * asked to believe.
 *
 * ---
 *
 * THE SNAP IS NOT A UI CONVENIENCE
 *
 * `STEP` quantises the dragged x. That is a rule the app enforces on itself:
 * every number displayed must be REPRODUCIBLE from the numbers shown beside it,
 * so a reader can retype the working into a calculator and get what the screen
 * says. Without the snap, x is some float like 1.4037…, the panel rounds it to
 * 1.40 for display, and the printed arithmetic no longer produces the printed
 * answer. It is perfectly traceable and impossible to check — which is exactly
 * the failure that made the rule necessary.
 */

export type Curve = {
  id: string;
  /** As written on the panel. */
  label: string;
  /** The exact derivative, as written. */
  derivativeLabel: string;
  f: (x: number) => number;
  /** Hand-differentiated. Displayed beside the numeric estimate. */
  exact: (x: number) => number;
  /** Sensible plotting window. */
  domain: [number, number];
  range: [number, number];
  /** Plain-language note shown under the working. */
  note: string;
};

export const CURVES: Curve[] = [
  {
    id: 'square',
    label: 'f(x) = x²',
    derivativeLabel: 'f′(x) = 2x',
    f: (x) => x * x,
    exact: (x) => 2 * x,
    domain: [-3, 3],
    range: [-1, 9],
    note: 'The slope is exactly twice the x you are standing on. At x = 0 the curve is momentarily flat — which is the bottom.',
  },
  {
    id: 'cubic',
    label: 'f(x) = x³ − 3x',
    derivativeLabel: 'f′(x) = 3x² − 3',
    f: (x) => x * x * x - 3 * x,
    exact: (x) => 3 * x * x - 3,
    domain: [-2.6, 2.6],
    range: [-6, 6],
    note: 'The slope hits zero twice, at x = −1 and x = 1. Those are the two turning points, and they are where the derivative curve crosses its own axis.',
  },
  {
    id: 'sine',
    label: 'f(x) = sin x',
    derivativeLabel: 'f′(x) = cos x',
    f: Math.sin,
    exact: Math.cos,
    domain: [-Math.PI * 1.5, Math.PI * 1.5],
    range: [-1.6, 1.6],
    note: 'Differentiating a sine gives a cosine — the same wave, shifted a quarter turn left. Steepest where the original crosses zero, flat at every peak.',
  },
  {
    id: 'recip',
    label: 'f(x) = x² ÷ 4 + 1',
    derivativeLabel: 'f′(x) = x ÷ 2',
    f: (x) => (x * x) / 4 + 1,
    exact: (x) => x / 2,
    domain: [-4, 4],
    range: [0, 6],
    note: 'A gentler parabola. Dividing the function by four divides its slope by four too — the shape of the rule survives the scaling.',
  },
];

/** The interval the dragged point snaps to. See the note above. */
export const STEP = 0.05;

/**
 * The step used for the central difference.
 *
 * 0.001 rather than something far smaller, and the reason is worth stating: the
 * central difference has truncation error of order h², so shrinking h improves
 * the estimate — until subtracting two nearly-equal doubles starts destroying
 * significant digits and the error climbs again. The minimum sits near the cube
 * root of machine epsilon, around 1e−5 to 1e−3 for these functions. Picking
 * 1e−9 "for accuracy" makes the answer WORSE, which is the counter-intuitive
 * part and the reason the constant is documented rather than tuned.
 */
export const H = 0.001;

/**
 * Central difference:  [ f(x + h) − f(x − h) ] ÷ 2h
 *
 * The symmetric form, not the forward one. Both are one subtraction and one
 * division, but the forward difference's error is order h and this is order h² —
 * so at h = 0.001 it is roughly a thousand times more accurate for identical
 * work. There is no reason to ever use the forward version except at a boundary.
 */
export function derivativeAt(f: (x: number) => number, x: number, h = H): number {
  return (f(x + h) - f(x - h)) / (2 * h);
}

/** Snap to the display grid, and clear the float dust that rounds badly. */
export function snap(x: number, step = STEP): number {
  return Math.round(x / step) * step;
}

export type Working = {
  x: number;
  y: number;
  /** Numeric estimate. */
  slope: number;
  /** Exact value from the hand-differentiated form. */
  exact: number;
  /** |numeric − exact|. Printed, because it should be tiny. */
  error: number;
  /** The rise/run triangle's corners, in curve coordinates. */
  triangle: { x0: number; x1: number; y0: number; y1: number };
  rise: number;
  run: number;
};

/**
 * Everything the panel needs, derived once.
 *
 * The rise and run are taken from the TANGENT LINE at two readable x values —
 * not from the underlying float slope and not from two points on the curve. That
 * matters: the panel prints `rise ÷ run = 1.40 ÷ 0.50 = 2.80`, and a reader
 * checking it on a calculator has to get 2.80. So the rise is computed from the
 * displayed run and the displayed slope, and every figure on screen is derived
 * from the ones printed next to it rather than from something more precise
 * hiding behind them.
 */
export function workingAt(curve: Curve, rawX: number, run = 0.5): Working {
  const x = snap(rawX);
  const y = curve.f(x);
  const slope = derivativeAt(curve.f, x);
  const exact = curve.exact(x);

  // Rounded to what the panel will actually print, THEN used for the arithmetic.
  const shownSlope = round2(slope);
  const shownRun = round2(run);
  const rise = round2(shownSlope * shownRun);

  return {
    x,
    y,
    slope,
    exact,
    error: Math.abs(slope - exact),
    triangle: {
      x0: x - shownRun / 2,
      x1: x + shownRun / 2,
      y0: y - rise / 2,
      y1: y + rise / 2,
    },
    rise,
    run: shownRun,
  };
}

export function round2(v: number): number {
  return Math.round(v * 100) / 100;
}

/** Signed-zero guard: `(-0).toFixed(2)` prints "-0.00", which reads as a bug. */
export function fixed(v: number, digits = 2): string {
  const s = (Object.is(v, -0) ? 0 : v).toFixed(digits);
  return s === '-0.00' || s === '-0.0' || s === '-0' ? s.slice(1) : s;
}

/** Samples for plotting, as [x, y] pairs. */
export function sample(
  f: (x: number) => number,
  [lo, hi]: [number, number],
  count = 240,
): [number, number][] {
  const out: [number, number][] = [];
  for (let i = 0; i <= count; i++) {
    const x = lo + ((hi - lo) * i) / count;
    out.push([x, f(x)]);
  }
  return out;
}
