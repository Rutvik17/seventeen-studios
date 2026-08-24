/**
 * Turning a set of factor exposures into a set of position weights.
 *
 * Three steps, each of which is a well-known piece of machinery and each of
 * which has one way it goes badly wrong:
 *
 *   1. STANDARDISE across the universe, so factors on different scales can be
 *      added. Goes wrong when one outlier eats the whole distribution.
 *   2. RANK and select. Goes wrong when the selection is made on the same data
 *      that will judge it.
 *   3. SIZE by mean-variance optimisation. Goes wrong when the covariance matrix
 *      is estimated from too few observations and quietly becomes singular —
 *      which is the single most common way a Markowitz optimiser produces
 *      nonsense while appearing to work.
 *
 * Each is handled below, and named.
 */

import { DIRECTION, FACTORS, type FactorName } from './factors';

/* ------------------------------------------------------------------ *
 * Cross-sectional standardisation
 * ------------------------------------------------------------------ */

/**
 * Z-scores across the universe, with the tails pulled in first.
 *
 * WINSORISED AT THREE DEVIATIONS, and the order matters: clip, then standardise,
 * then clip again. A single stock that ran 400% in a month has a raw momentum
 * score twenty standard deviations out, and left alone it does two things — it
 * inflates the standard deviation so every other stock's score shrinks toward
 * zero, and it takes an enormous position of its own. One name then IS the
 * portfolio.
 *
 * Non-finite values are scored zero rather than dropped, which keeps every row
 * the same length. A stock with too little history to compute momentum is
 * neutral on momentum, not absent from the universe.
 */
export function zscore(values: number[]): number[] {
  const finite = values.filter((v) => Number.isFinite(v));
  if (finite.length < 3) return values.map(() => 0);

  const sorted = [...finite].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  const spread =
    stdevOf(finite) ||
    // Every value identical: no dispersion, no signal, no division by zero.
    1;

  const clipped = values.map((v) =>
    Number.isFinite(v) ? Math.max(median - 3 * spread, Math.min(median + 3 * spread, v)) : median,
  );

  const m = meanOf(clipped);
  const s = stdevOf(clipped) || 1;
  return clipped.map((v) => Math.max(-3, Math.min(3, (v - m) / s)));
}

const meanOf = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

function stdevOf(xs: number[]): number {
  if (xs.length < 2) return 0;
  const m = meanOf(xs);
  return Math.sqrt(xs.reduce((s, v) => s + (v - m) ** 2, 0) / (xs.length - 1));
}

/**
 * Standardise within industry rather than across the whole universe.
 *
 * THIS IS WHAT MAKES IT STOCK SELECTION RATHER THAN A SECTOR BET.
 *
 * Rank a semiconductor against a utility on twelve-month momentum and most of
 * what the ranking measures is that semiconductors ran and utilities did not.
 * The model would then load the long book with whatever industry was in favour —
 * a call that is available for nothing in a sector ETF, carries the risk of the
 * whole industry rotating at once, and has nothing to do with the stock.
 *
 * Demeaning inside each bucket asks the question that has an answer: of these
 * semiconductors, which ones. What survives is the part specific to the company.
 *
 * A bucket with fewer than four names cannot be demeaned against itself without
 * mostly cancelling its own signal, so those fall back to the universe-wide
 * score rather than being zeroed out.
 */
function industryNeutral(values: number[], industries: string[]): number[] {
  const groups = new Map<string, number[]>();
  values.forEach((_, i) => {
    const key = industries[i] ?? '';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(i);
  });

  const out = [...values];
  for (const [, members] of groups) {
    if (members.length < 4) continue;
    const inside = members.map((i) => values[i]);
    const m = meanOf(inside);
    const s = stdevOf(inside) || 1;
    for (const i of members) out[i] = (values[i] - m) / s;
  }
  return out;
}

/**
 * One score per stock, from a panel of exposures.
 *
 * Each factor is standardised across the universe, neutralised within industry,
 * given its declared sign, and averaged. Factors marked with direction 0 — beta
 * — contribute nothing to the score; they exist to be neutralised later, not bet
 * on.
 *
 * EQUAL WEIGHTING, deliberately. Fitting a weight per factor on the same history
 * that then evaluates the model is how a backtest learns which factor happened
 * to work and reports it as skill. Equal weights cannot overfit because there is
 * nothing in them to fit.
 */
export function compositeScores(
  panel: Record<FactorName, number>[],
  industries: string[] = [],
): { score: number[]; standardised: Record<FactorName, number[]> } {
  const standardised = {} as Record<FactorName, number[]>;
  for (const factor of FACTORS) {
    const raw = zscore(panel.map((row) => row[factor]));
    standardised[factor] = industries.length === raw.length
      ? zscore(industryNeutral(raw, industries))
      : raw;
  }

  const active = FACTORS.filter((f) => DIRECTION[f] !== 0);
  const score = panel.map((_, i) =>
    active.reduce((sum, f) => sum + DIRECTION[f] * standardised[f][i], 0) / active.length,
  );

  return { score, standardised };
}

/* ------------------------------------------------------------------ *
 * Covariance
 * ------------------------------------------------------------------ */

/** Sample covariance of column-wise return series. */
export function covariance(returns: number[][]): number[][] {
  const n = returns.length;
  const t = returns[0]?.length ?? 0;
  const means = returns.map(meanOf);
  const out = Array.from({ length: n }, () => new Array<number>(n).fill(0));

  for (let i = 0; i < n; i++) {
    for (let j = i; j < n; j++) {
      let sum = 0;
      for (let k = 0; k < t; k++) {
        sum += (returns[i][k] - means[i]) * (returns[j][k] - means[j]);
      }
      const value = t > 1 ? sum / (t - 1) : 0;
      out[i][j] = value;
      out[j][i] = value;
    }
  }
  return out;
}

/**
 * Shrink the sample covariance toward a structured target.
 *
 * THIS IS THE STEP THAT MAKES MARKOWITZ USABLE, and leaving it out is why the
 * textbook version has a reputation for producing absurd portfolios.
 *
 * A covariance matrix over N stocks has N(N+1)/2 free parameters. Twenty stocks
 * is 210 of them, estimated from perhaps sixty monthly observations. The
 * estimate is not merely noisy — once N approaches T the matrix becomes
 * ill-conditioned, and when N exceeds T it is singular and has no inverse at
 * all. The optimiser then finds "arbitrage" in the estimation error: enormous
 * offsetting positions in two stocks that happened to look identical.
 *
 * Ledoit and Wolf's answer is to average the noisy estimate with a heavily
 * structured one. The target here is the CONSTANT-CORRELATION model: every pair
 * shares the average correlation, and each stock keeps its own variance. It has
 * two parameters instead of two hundred, it is always invertible, and it is
 * wrong in a stable way — which is worth more than being right on average and
 * catastrophic occasionally.
 *
 * `delta` is the shrinkage intensity. Ledoit-Wolf derive an optimal value
 * analytically; this takes it as a parameter so the effect can be seen by moving
 * it, with a default in the range that derivation usually lands in.
 */
export function shrinkCovariance(sample: number[][], delta = 0.4): number[][] {
  const n = sample.length;
  if (n === 0) return sample;

  const sd = sample.map((row, i) => Math.sqrt(Math.max(row[i], 1e-12)));

  // The average off-diagonal correlation.
  let sum = 0;
  let count = 0;
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      sum += sample[i][j] / (sd[i] * sd[j]);
      count++;
    }
  }
  const meanCorrelation = count > 0 ? sum / count : 0;

  const out = Array.from({ length: n }, () => new Array<number>(n).fill(0));
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const target = i === j ? sample[i][i] : meanCorrelation * sd[i] * sd[j];
      out[i][j] = (1 - delta) * sample[i][j] + delta * target;
    }
  }
  return out;
}

/**
 * Invert a matrix by Gauss-Jordan elimination with partial pivoting.
 *
 * Pivoting is not optional. Without it, a zero or tiny leading element divides
 * the row and the result fills with infinities — and a covariance matrix built
 * from real returns produces small pivots often. Returns null rather than
 * garbage when the matrix is singular, so the caller can fall back to something
 * that works instead of trading a portfolio of NaNs.
 */
export function invert(matrix: number[][]): number[][] | null {
  const n = matrix.length;
  const a = matrix.map((row, i) => [
    ...row,
    ...Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)),
  ]);

  for (let col = 0; col < n; col++) {
    let pivot = col;
    for (let row = col + 1; row < n; row++) {
      if (Math.abs(a[row][col]) > Math.abs(a[pivot][col])) pivot = row;
    }
    if (Math.abs(a[pivot][col]) < 1e-12) return null;
    [a[col], a[pivot]] = [a[pivot], a[col]];

    const divisor = a[col][col];
    for (let k = 0; k < 2 * n; k++) a[col][k] /= divisor;

    for (let row = 0; row < n; row++) {
      if (row === col) continue;
      const factor = a[row][col];
      if (factor === 0) continue;
      for (let k = 0; k < 2 * n; k++) a[row][k] -= factor * a[col][k];
    }
  }

  return a.map((row) => row.slice(n));
}

/* ------------------------------------------------------------------ *
 * Mean-variance optimisation
 * ------------------------------------------------------------------ */

export type OptimiserOptions = {
  /**
   * How far the covariance is allowed to reshape the alpha, from 0 to 1.
   *
   * THIS REPLACED A RISK-AVERSION TERM THAT COULD NOT DO ANYTHING. The textbook
   * objective carries a λ on the variance penalty, and its closed-form solution
   * is w = (1/λ)·Σ⁻¹μ — in which λ is a UNIFORM SCALE on every weight. This book
   * is then normalised to a fixed gross exposure, and normalising divides that
   * scale straight back out. Measured: λ of 3, 8 and 20 produced returns
   * identical to two decimal places, because they produced the same portfolio.
   *
   * A λ that matters needs a genuinely constrained optimiser — a quadratic
   * program where the risk penalty trades against the constraints rather than
   * being rescaled away afterwards. Short of that, the honest knob is this one:
   * blend between the raw alpha ranking and the risk-adjusted solution. At 0 the
   * book ignores correlation and sizes purely on conviction; at 1 it is the full
   * mean-variance answer, which is what shrinks two names that move together.
   */
  tilt: number;
  /** Shrinkage intensity for the covariance estimate. */
  shrinkage: number;
  /** Largest absolute weight any one name may take. */
  maxWeight: number;
  /** Total gross exposure — long plus short, as a fraction of capital. */
  gross: number;
  /**
   * Net market exposure the book is built to hold, long minus short.
   *
   * ZERO IS NOT THE OBVIOUS DEFAULT, and treating it as one was the mistake
   * that produced a losing model. A dollar-neutral book's benchmark is cash: it
   * strips out the market return by construction, so it cannot participate in a
   * rally and cannot beat an index. Measured over this sample, the long
   * selection returned 20.6% a year against a universe that returned 15.1% —
   * the stock picking worked, and neutrality threw the result away by pairing it
   * against a short book that returned 28.7%.
   *
   * At 1 the book is fully invested long with the short leg funding a tilt; at 0
   * it is the market-neutral construction. Anything between is the 130/30 family.
   */
  net: number;
  /** When true, hold beta at zero. Incompatible with a non-zero net exposure. */
  betaNeutral: boolean;
};

/*
  LONG ONLY, FULLY INVESTED, and every one of these was measured rather than
  assumed. The market-neutral construction they replaced returned −8.4% a year on
  the same signal, because it paired a long book that beat its universe by five
  points against a short book that rose 28.7%.

  `maxWeight` at 5% against a top quintile of roughly fifty names means the cap
  binds on the strongest handful and the rest size themselves — which is the
  point of a cap. Tighter and the optimiser is decoration; looser and one name
  can become a fifth of the book.
*/
export const OPTIMISER: OptimiserOptions = {
  tilt: 1,
  shrinkage: 0.4,
  maxWeight: 0.05,
  gross: 1,
  net: 1,
  betaNeutral: false,
};

export type Allocation = {
  weights: number[];
  /** True when the covariance could not be inverted and the fallback was used. */
  degenerate: boolean;
  /** Net beta of the book after neutralising. Should sit near zero. */
  netBeta: number;
};

/**
 * Solve for weights.
 *
 *     maximise   wᵀμ − (λ/2)·wᵀΣw
 *
 * The unconstrained solution is w = (1/λ)·Σ⁻¹μ, and the whole reason to bother
 * with Σ at all is the second term: if the alpha model likes two stocks that
 * move together, the covariance recognises the overlap and shrinks both rather
 * than doubling the same bet.
 *
 * Then three constraints, applied in an order that matters:
 *
 *   BETA NEUTRAL first — subtract the beta-weighted component so the book does
 *   not simply own the market. This is the point of the whole exercise: if the
 *   index falls five percent, a neutral book is not down five percent, and
 *   whatever is left is the part attributable to the ranking.
 *
 *   DOLLAR NEUTRAL second — long and short sides are equalised, so the book has
 *   no directional tilt beyond what beta neutrality already removed.
 *
 *   CAPPED and SCALED last, because clipping a weight changes the sums above,
 *   and rescaling after capping is what keeps gross exposure at the stated
 *   number rather than wherever the clipping left it.
 */
export function optimise(
  alpha: number[],
  covMatrix: number[][],
  betas: number[],
  options: OptimiserOptions = OPTIMISER,
): Allocation {
  const n = alpha.length;
  if (n === 0) return { weights: [], degenerate: false, netBeta: 0 };

  const sigma = shrinkCovariance(covMatrix, options.shrinkage);
  const inverse = invert(sigma);

  let risky: number[];
  let degenerate = false;

  if (inverse) {
    risky = inverse.map((row) => row.reduce((s, v, j) => s + v * alpha[j], 0));
  } else {
    /*
      Singular even after shrinkage. Fall back to inverse-variance scaling — the
      diagonal-only optimiser. It ignores correlation, which is worse, and it is
      finite, which is the whole point.
    */
    degenerate = true;
    risky = alpha.map((a, i) => a / Math.max(sigma[i][i], 1e-8));
  }

  /*
    Both legs are put on the same footing before blending.

    Σ⁻¹α and α live on wildly different scales — inverting a covariance of
    monthly returns multiplies by a factor of hundreds — so mixing them raw would
    make `tilt` a switch rather than a dial. Normalising each to unit gross first
    is what lets the parameter mean what it says.
  */
  const unit = (xs: number[]) => {
    const g = xs.reduce((s, v) => s + Math.abs(v), 0);
    return g > 1e-12 ? xs.map((v) => v / g) : xs;
  };
  const a = unit(alpha);
  const b = unit(risky);
  const t = Math.max(0, Math.min(1, options.tilt));
  const raw = a.map((v, i) => (1 - t) * v + t * b[i]);

  /*
    THE CONSTRAINTS FIGHT EACH OTHER, SO THEY ARE APPLIED REPEATEDLY.

    Applied once in sequence they do not hold. Neutralising beta, then centring
    for dollar neutrality, then clipping to the position cap, then rescaling to
    the gross target — each of the last three moves the book off the neutrality
    the first one established. Measured before this loop went in: net beta ran
    from −0.80 to +0.28 across months, on a book whose entire purpose is to have
    none.

    Iterating converges because each projection is toward a nearby point: the
    beta projection is orthogonal, the centring is a rank-one shift, and only the
    clipping is a genuine distortion. It converges SLOWLY, though, and the count
    was set by measuring rather than by guessing — six passes was tried first and
    left a median residual of −0.095, which on a book claiming neutrality is not
    a rounding error:

        passes   min beta   median    max
        6        -0.2335    -0.0952   -0.0024
        12       -0.1242    -0.0282   -0.0008
        30       -0.0163    -0.0010   -0.0000

    The loop ends on the rescale, so gross exposure and the position cap hold
    exactly and beta holds to three decimals. That is the right way round: the
    first two are promises to a risk desk, the third is a property of an estimate
    that has its own error bars.
  */
  let w = [...raw];
  const betaNorm = betas.reduce((s, b) => s + b * b, 0);

  for (let pass = 0; pass < 30; pass++) {
    // Beta neutral, when that is what the book is for.
    if (options.betaNeutral && betaNorm > 1e-12) {
      const dot = betas.reduce((s, b, i) => s + b * w[i], 0);
      w = w.map((v, i) => v - (dot / betaNorm) * betas[i]);
    }

    /*
      Shift the whole book so it holds the intended NET exposure.

      Subtracting the mean is the special case for net zero. Shifting to a target
      is the general one: every weight moves by the same amount, which leaves the
      RANKING untouched — the model's opinion about which names are better is
      preserved, and only how much market the book carries changes.
    */
    const sum = w.reduce((s, v) => s + v, 0);
    const shift = (options.net - sum) / alpha.length;
    w = w.map((v) => v + shift);

    /*
      Long only, when the two exposures say so.

      Net equal to gross has exactly one solution: every weight non-negative. The
      projection has to enforce that directly, because the loop finishes on the
      gross rescale and a rescale cannot remove a sign — asking for net 1 and
      gross 1 without this produced a book that still held shorts, which is not a
      near miss, it is arithmetically impossible.
    */
    if (options.net >= options.gross - 1e-9) w = w.map((v) => Math.max(0, v));

    // Position cap, then back to the target gross exposure.
    const floor = options.net >= options.gross - 1e-9 ? 0 : -options.maxWeight;
    w = w.map((v) => Math.max(floor, Math.min(options.maxWeight, v)));
    const grossNow = w.reduce((s, v) => s + Math.abs(v), 0);
    if (grossNow > 1e-12) w = w.map((v) => (v * options.gross) / grossNow);
  }

  return {
    weights: w,
    degenerate,
    netBeta: w.reduce((s, v, i) => s + v * (betas[i] || 0), 0),
  };
}
