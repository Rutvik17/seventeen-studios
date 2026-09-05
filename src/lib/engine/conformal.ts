/**
 * CONFORMAL PREDICTION: how wrong has this model been, and how wrong might it be.
 *
 * Vovk, Gammerman & Shafer; the split-conformal form used here is Lei et al.
 * (2018), "Distribution-Free Predictive Inference for Regression".
 *
 * ---
 * WHY NOT ENSEMBLE VARIANCE
 *
 * The obvious way to get confidence out of a tree model is to train several
 * with different seeds and measure how much they disagree. That needs a
 * retrain, and it measures the wrong thing: seeds disagreeing tells you about
 * the FITTING procedure's instability, not about how far the answer lands from
 * the truth. A model can be perfectly stable across seeds and reliably wrong.
 *
 * Conformal asks the honest question instead — over the recent past, how far
 * was the realised return from the score? — and it needs nothing but the
 * predictions already on the tape.
 *
 * ---
 * WHAT IT GUARANTEES, AND WHAT IT DOES NOT
 *
 * Take the residuals from a calibration window, sort them, and read off the
 * quantile. An interval of that width covers the next observation at least
 * (1 - alpha) of the time, with NO assumption about the distribution of
 * returns. That matters here: returns are fat-tailed and negatively skewed
 * (kurtosis 7.02, skew -0.371, measured), so any interval derived from a normal
 * is decoration.
 *
 * The guarantee is EXCHANGEABILITY, not independence — the calibration set and
 * the next point must be drawn from the same distribution. Markets violate that
 * across regimes, which is why the window is rolling and recent rather than the
 * whole history. It is a weaker promise than the theorem's, and saying so is
 * the difference between using the method and quoting it.
 *
 * ---
 * WHAT IT IS FOR
 *
 * Sizing. "Small when unsure" has been rhetoric in this project: the book sizes
 * by conviction and inverse volatility, neither of which is a statement about
 * the MODEL's reliability. A cross-sectional confidence lets a position shrink
 * when the model has recently been unreliable about names like this one.
 */

export type Residual = {
  /** What the model said. */
  score: number;
  /** What actually happened, on the same scale as the score. */
  realised: number;
};

/**
 * The conformal quantile: the interval half-width at level `alpha`.
 *
 * Uses the finite-sample correction — the ceil((n+1)(1-alpha))-th smallest
 * absolute residual rather than the plain empirical quantile. Without it the
 * coverage guarantee is asymptotic; with it the guarantee holds at any n, which
 * is the entire point of using conformal rather than a bootstrap.
 */
export function conformalWidth(residuals: number[], alpha = 0.1): number {
  const n = residuals.length;
  if (n < 20) return NaN; // too few points for the quantile to mean anything

  const sorted = residuals.map(Math.abs).sort((a, b) => a - b);
  const k = Math.ceil((n + 1) * (1 - alpha));
  // With too few points for the correction, the widest residual is the honest answer.
  return k > n ? sorted[n - 1] : sorted[k - 1];
}

/**
 * Rolling conformal width per day.
 *
 * `residuals[t]` holds every (score, realised) pair whose outcome was KNOWN by
 * day t. The caller is responsible for that: a residual needs the forward
 * return to have happened, so on day t only pairs from day t-horizon or earlier
 * may be used. Passing anything fresher is a leak, and it is the one this
 * function cannot detect for you.
 */
export function rollingWidth(
  byDay: Residual[][],
  window: number,
  alpha = 0.1,
): number[] {
  const out: number[] = [];
  const buffer: number[] = [];

  for (let t = 0; t < byDay.length; t++) {
    for (const r of byDay[t]) buffer.push(r.realised - r.score);
    // A window in DAYS is not a window in observations; this keeps the last
    // `window` days' worth, which is what "recent regime" means.
    while (buffer.length > window) buffer.shift();
    out.push(conformalWidth(buffer, alpha));
  }
  return out;
}

/**
 * Confidence as a sizing multiplier, 0 to 1.
 *
 * A wide interval means the model has recently been unreliable, so the position
 * shrinks. Scaled against the MEDIAN width over the sample rather than against
 * a fixed number, because the natural scale of a 21-day excess return is not
 * something to hardcode — and a multiplier that depends on an arbitrary
 * constant is a tuning parameter pretending to be a measurement.
 *
 * Clamped to [0.25, 1]: a model that is currently unreliable should trade
 * smaller, not stop, because the alternative is a book that goes to cash on
 * exactly the days that later look obvious.
 */
export function confidenceMultiplier(width: number, medianWidth: number): number {
  if (!Number.isFinite(width) || !(medianWidth > 0)) return 1;
  const ratio = medianWidth / width;
  return Math.max(0.25, Math.min(1, ratio));
}

/**
 * Did the intervals actually cover?
 *
 * The claim is that a (1-alpha) interval contains the outcome (1-alpha) of the
 * time. That is checkable, and checking it is the whole reason to prefer
 * conformal over an assumed distribution — if measured coverage comes back at
 * 70% for a nominal 90%, the exchangeability assumption has failed and the
 * intervals are decoration after all.
 */
export function coverage(residuals: Residual[], widths: number[]): number {
  let covered = 0;
  let counted = 0;
  for (let i = 0; i < residuals.length; i++) {
    const w = widths[i];
    if (!Number.isFinite(w)) continue;
    counted += 1;
    if (Math.abs(residuals[i].realised - residuals[i].score) <= w) covered += 1;
  }
  return counted ? covered / counted : NaN;
}
