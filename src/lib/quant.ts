/**
 * Quantitative risk, computed rather than quoted.
 *
 * A Monte Carlo engine for the risk instrument on the home page. Everything
 * here is standard method — geometric Brownian motion, historical-simulation
 * VaR, expected shortfall, Cholesky for correlation — implemented directly so
 * the page can show its own working.
 *
 * ---
 *
 * THE POINT OF SHIPPING THIS AT ALL
 *
 * A studio with no client list cannot prove competence with a logo wall, and
 * every substitute for one is a lie a competent buyer spots. An instrument that
 * computes live in front of them cannot be faked: the inputs are exposed, the
 * outputs move, and a reader who knows the subject can check the numbers.
 *
 * `varAnalytic` is there for exactly that reason. Under GBM the terminal
 * log-return is normal, so value-at-risk has a closed form — which means the
 * simulation can be checked against an exact answer in the same frame it is
 * produced, and the page can display the error. A Monte Carlo that agrees with
 * theory to three decimals is a claim the reader verifies themselves. That is
 * worth more than a testimonial and it costs one extra function.
 *
 * ---
 *
 * WHY THE TERMINAL DISTRIBUTION IS NOT STEPPED
 *
 * Under GBM the terminal value has an EXACT lognormal distribution, so drawing
 * it in one step is not an approximation of a 252-step walk — it is the same
 * distribution, sampled directly. Stepping would be 252× the work for identical
 * statistics and strictly more floating-point error. Paths are stepped only
 * where the path itself is the output, which is the fan chart, and that needs a
 * few hundred rather than fifty thousand.
 *
 * This is the whole difference between a demo that runs at 60fps and one that
 * locks the tab, and it comes from reading the model rather than from
 * optimising the loop.
 */

/* ------------------------------------------------------------------ *
 * Sampling
 * ------------------------------------------------------------------ */

/** Mulberry32. Seeded so a given input always produces the same figure. */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Standard normal draws, Box–Muller in polar form.
 *
 * The polar (Marsaglia) variant rejects points outside the unit circle instead
 * of calling `sin` and `cos`. It draws about 27% more uniforms and skips two
 * trigonometric calls, which is a clear win — and it avoids the classic
 * Box–Muller trap where `u1` lands on exactly 0 and `log(0)` returns −∞.
 *
 * Both values of each pair are kept. Throwing the second away is a common and
 * completely free 2× slowdown.
 */
export function normalStream(random: () => number): () => number {
  let spare: number | null = null;
  return () => {
    if (spare !== null) {
      const v = spare;
      spare = null;
      return v;
    }
    let u: number, v: number, s: number;
    do {
      u = random() * 2 - 1;
      v = random() * 2 - 1;
      s = u * u + v * v;
    } while (s >= 1 || s === 0);
    const f = Math.sqrt((-2 * Math.log(s)) / s);
    spare = v * f;
    return u * f;
  };
}

/**
 * Inverse standard normal CDF — Acklam's rational approximation.
 *
 * Accurate to about 1.15e−9 across the whole range, which is far beyond what
 * this instrument needs and cheap enough not to matter. Used for the analytic
 * VaR the simulation is checked against.
 */
export function normalQuantile(p: number): number {
  if (p <= 0 || p >= 1) return p <= 0 ? -Infinity : Infinity;

  const a = [-3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2,
             1.383577518672690e2, -3.066479806614716e1, 2.506628277459239];
  const b = [-5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2,
             6.680131188771972e1, -1.328068155288572e1];
  const c = [-7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838,
             -2.549732539343734, 4.374664141464968, 2.938163982698783];
  const d = [7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996,
             3.754408661907416];

  const plow = 0.02425;
  const phigh = 1 - plow;

  if (p < plow) {
    const q = Math.sqrt(-2 * Math.log(p));
    return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
           ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }
  if (p > phigh) {
    const q = Math.sqrt(-2 * Math.log(1 - p));
    return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
            ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }
  const q = p - 0.5;
  const r = q * q;
  return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q /
         (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
}

/* ------------------------------------------------------------------ *
 * Model
 * ------------------------------------------------------------------ */

export type RiskInputs = {
  /** Portfolio value at t = 0, in currency units. */
  notional: number;
  /** Expected annual return, as a decimal. 0.08 is 8%. */
  drift: number;
  /** Annualised volatility, as a decimal. 0.16 is 16%. */
  volatility: number;
  /** Horizon in trading days. 252 is one year. */
  horizonDays: number;
  /** Tail probability. 0.05 is 95% confidence. */
  alpha: number;
  /** Simulated terminal draws. */
  paths: number;
  seed: number;
};

export type RiskResult = {
  /** Sorted terminal portfolio values. */
  terminal: Float64Array;
  /** Loss at the alpha quantile, positive = a loss. */
  varMonteCarlo: number;
  /** The same quantity in closed form, for verification. */
  varAnalytic: number;
  /** |MC − analytic| ÷ analytic. Displayed, because it should be small. */
  relativeError: number;
  /** Mean loss GIVEN the loss exceeds VaR. Always ≥ VaR. */
  expectedShortfall: number;
  /** Probability the portfolio ends below its starting value. */
  probabilityOfLoss: number;
  median: number;
  /** Bucketed terminal values, for the histogram. */
  histogram: { x0: number; x1: number; count: number }[];
};

const TRADING_DAYS = 252;

/**
 * One Monte Carlo run.
 *
 * Terminal values are drawn directly from the exact lognormal law rather than
 * stepped — see the note at the top of this file.
 *
 *     S_T = S_0 · exp[ (μ − σ²/2)·T + σ·√T·Z ]
 *
 * The −σ²/2 is the Itô correction and it is the term people leave out. Without
 * it the simulated mean comes out at S_0·e^{μT}·e^{σ²T/2} rather than S_0·e^{μT},
 * so the whole distribution drifts upward with volatility and a RISKIER
 * portfolio looks more profitable. It is a one-symbol error that inverts the
 * result, which is exactly why the analytic cross-check below is worth having.
 */
export function simulateRisk(inputs: RiskInputs): RiskResult {
  const { notional, drift, volatility, horizonDays, alpha, paths, seed } = inputs;
  const T = horizonDays / TRADING_DAYS;
  const sqrtT = Math.sqrt(T);

  const normal = normalStream(seededRandom(seed));
  const terminal = new Float64Array(paths);

  const growth = (drift - (volatility * volatility) / 2) * T;
  const shock = volatility * sqrtT;

  for (let i = 0; i < paths; i++) {
    terminal[i] = notional * Math.exp(growth + shock * normal());
  }

  terminal.sort();

  // Historical-simulation VaR: the empirical quantile of the sorted outcomes.
  // No distributional assumption is made at this step, which is the whole point
  // of doing it by simulation — swap the model above for a fat-tailed one and
  // this line still holds.
  const index = Math.max(0, Math.min(paths - 1, Math.floor(alpha * paths)));
  const varQuantile = terminal[index];
  const varMonteCarlo = notional - varQuantile;

  // Closed form, for the same quantity.
  const z = normalQuantile(alpha);
  const analyticQuantile = notional * Math.exp(growth + shock * z);
  const varAnalytic = notional - analyticQuantile;

  // Expected shortfall — the average of everything at or beyond the quantile.
  // This is the number a regulator asks for and the one VaR alone hides: VaR
  // says how bad the threshold is, ES says how bad it is once you are past it.
  let tail = 0;
  for (let i = 0; i <= index; i++) tail += terminal[i];
  const expectedShortfall = notional - tail / (index + 1);

  let below = 0;
  for (let i = 0; i < paths; i++) {
    if (terminal[i] < notional) below++;
    else break; // sorted, so the first value at or above notional ends it
  }

  return {
    terminal,
    varMonteCarlo,
    varAnalytic,
    relativeError:
      varAnalytic === 0 ? 0 : Math.abs(varMonteCarlo - varAnalytic) / Math.abs(varAnalytic),
    expectedShortfall,
    probabilityOfLoss: below / paths,
    median: terminal[Math.floor(paths / 2)],
    histogram: bucket(terminal, 46),
  };
}

function bucket(
  sorted: Float64Array,
  bins: number,
): { x0: number; x1: number; count: number }[] {
  // Clipped at the 0.5th and 99.5th percentiles. A lognormal has a long right
  // tail, and letting one lucky path set the axis squashes the entire body of
  // the distribution into two bars.
  const lo = sorted[Math.floor(sorted.length * 0.005)];
  const hi = sorted[Math.floor(sorted.length * 0.995)];
  const width = (hi - lo) / bins || 1;
  const out = Array.from({ length: bins }, (_, i) => ({
    x0: lo + i * width,
    x1: lo + (i + 1) * width,
    count: 0,
  }));
  for (let i = 0; i < sorted.length; i++) {
    const b = Math.floor((sorted[i] - lo) / width);
    if (b >= 0 && b < bins) out[b].count++;
  }
  return out;
}

/* ------------------------------------------------------------------ *
 * Paths, for the fan chart
 * ------------------------------------------------------------------ */

export type FanBand = {
  /** Percentile this band's upper edge represents, e.g. 0.95. */
  upper: number;
  lower: number;
  /** One value per step, inclusive of t = 0. */
  hi: number[];
  lo: number[];
};

export type FanChart = {
  steps: number;
  bands: FanBand[];
  median: number[];
  /** A handful of individual walks, drawn thin over the bands. */
  samples: number[][];
};

/**
 * Percentile bands over time.
 *
 * These paths ARE stepped, because the shape of the walk is the output. Only a
 * few hundred are needed: the bands are quantiles, and a quantile estimate
 * converges far faster than a tail estimate — which is why the terminal
 * distribution above uses fifty thousand draws and this uses six hundred.
 */
export function simulateFan(
  inputs: Omit<RiskInputs, 'paths' | 'alpha'>,
  paths = 600,
  steps = 60,
): FanChart {
  const { notional, drift, volatility, horizonDays, seed } = inputs;
  const T = horizonDays / TRADING_DAYS;
  const dt = T / steps;
  const sqrtDt = Math.sqrt(dt);
  const growth = (drift - (volatility * volatility) / 2) * dt;
  const shock = volatility * sqrtDt;

  const normal = normalStream(seededRandom(seed ^ 0x9e3779b9));

  // Column-major: one contiguous block per time step, so taking a quantile at
  // a step sorts a contiguous slice instead of gathering across rows.
  const grid = new Float64Array(paths * (steps + 1));
  for (let p = 0; p < paths; p++) grid[p] = notional;

  for (let s = 1; s <= steps; s++) {
    const prev = (s - 1) * paths;
    const cur = s * paths;
    for (let p = 0; p < paths; p++) {
      grid[cur + p] = grid[prev + p] * Math.exp(growth + shock * normal());
    }
  }

  const levels: [number, number][] = [
    [0.95, 0.05],
    [0.8, 0.2],
    [0.65, 0.35],
  ];
  const bands: FanBand[] = levels.map(([upper, lower]) => ({
    upper,
    lower,
    hi: [],
    lo: [],
  }));
  const median: number[] = [];

  const column = new Float64Array(paths);
  for (let s = 0; s <= steps; s++) {
    column.set(grid.subarray(s * paths, s * paths + paths));
    column.sort();
    median.push(column[Math.floor(paths / 2)]);
    for (const band of bands) {
      band.hi.push(column[Math.min(paths - 1, Math.floor(band.upper * paths))]);
      band.lo.push(column[Math.floor(band.lower * paths)]);
    }
  }

  const samples: number[][] = [];
  for (let p = 0; p < 5; p++) {
    const idx = Math.floor((p + 0.5) * (paths / 5));
    const walk: number[] = [];
    for (let s = 0; s <= steps; s++) walk.push(grid[s * paths + idx]);
    samples.push(walk);
  }

  return { steps, bands, median, samples };
}

/* ------------------------------------------------------------------ *
 * Correlation
 * ------------------------------------------------------------------ */

/**
 * Cholesky decomposition — the lower triangular L with L·Lᵀ = A.
 *
 * How correlated shocks are generated: draw independent normals, multiply by L,
 * and the result carries the covariance structure of A. Returns null when the
 * matrix is not positive definite, which for a correlation matrix means the
 * correlations are mutually impossible — three assets cannot all be −0.9 with
 * each other. Returning null rather than NaN lets the interface say so.
 */
export function cholesky(matrix: number[][]): number[][] | null {
  const n = matrix.length;
  const L = Array.from({ length: n }, () => new Array<number>(n).fill(0));
  for (let i = 0; i < n; i++) {
    for (let j = 0; j <= i; j++) {
      let sum = 0;
      for (let k = 0; k < j; k++) sum += L[i][k] * L[j][k];
      if (i === j) {
        const d = matrix[i][i] - sum;
        if (d <= 0) return null;
        L[i][j] = Math.sqrt(d);
      } else {
        L[i][j] = (matrix[i][j] - sum) / L[j][j];
      }
    }
  }
  return L;
}

/** Portfolio variance for weights w and covariance Σ: wᵀΣw. */
export function portfolioVariance(weights: number[], covariance: number[][]): number {
  let total = 0;
  for (let i = 0; i < weights.length; i++) {
    for (let j = 0; j < weights.length; j++) {
      total += weights[i] * covariance[i][j] * weights[j];
    }
  }
  return total;
}

export const formatCurrency = (v: number): string =>
  new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
    maximumFractionDigits: 0,
  }).format(v);

export const formatPercent = (v: number, digits = 1): string =>
  `${(v * 100).toFixed(digits)}%`;

/* ------------------------------------------------------------------ *
 * Portfolios
 * ------------------------------------------------------------------ */

export type Holding = {
  symbol: string;
  name: string;
  /** Share of the portfolio, 0–1. Weights across a portfolio sum to 1. */
  weight: number;
  /** Annualised, from real history. */
  drift: number;
  volatility: number;
};

/**
 * The volatility of a portfolio, in closed form.
 *
 *     σ_p = √( wᵀ Σ w )   where Σ_ij = ρ_ij · σ_i · σ_j
 *
 * This is the single most important formula in portfolio theory and it is worth
 * seeing why. If every pair moved in perfect lockstep — every ρ equal to 1 — the
 * expression collapses to the weighted average of the individual volatilities,
 * and combining assets would buy you nothing at all.
 *
 * Real correlations are below 1, every cross term shrinks, and the result comes
 * out BELOW that weighted average. The gap is diversification. It is not a
 * strategy or an opinion; it is arithmetic, and it is the only thing in finance
 * that reliably gives something for nothing.
 */
export function portfolioVolatility(
  holdings: Holding[],
  correlations: number[][],
): number {
  let variance = 0;
  for (let i = 0; i < holdings.length; i++) {
    for (let j = 0; j < holdings.length; j++) {
      variance +=
        holdings[i].weight *
        holdings[j].weight *
        correlations[i][j] *
        holdings[i].volatility *
        holdings[j].volatility;
    }
  }
  return Math.sqrt(Math.max(0, variance));
}

/** What the volatility would be if everything moved together — the no-free-lunch case. */
export function undiversifiedVolatility(holdings: Holding[]): number {
  return holdings.reduce((sum, h) => sum + h.weight * h.volatility, 0);
}

export type PortfolioResult = RiskResult & {
  /** Annualised portfolio volatility, from the covariance matrix. */
  volatility: number;
  /** What it would be with every correlation at 1. */
  undiversified: number;
  /** Portfolio drift, the weighted average of the parts. */
  drift: number;
};

/**
 * Monte Carlo over a correlated portfolio.
 *
 * Each simulated future draws one independent normal per asset, multiplies the
 * vector by the Cholesky factor of the correlation matrix, and uses the results
 * as each asset's shock. That single matrix multiply is what makes the assets
 * move together the way they actually do — draw them independently and the
 * simulation quietly assumes perfect diversification, which understates the
 * risk of every real portfolio ever assembled.
 *
 * Terminal values are drawn in one step rather than walked, because under GBM
 * the terminal distribution is exactly lognormal — see the note at the top of
 * this file.
 */
export function simulatePortfolio(
  holdings: Holding[],
  correlations: number[][],
  options: { notional: number; horizonDays: number; alpha: number; paths: number; seed: number },
): PortfolioResult | null {
  const { notional, horizonDays, alpha, paths, seed } = options;
  const n = holdings.length;

  const covariance = correlations.map((row, i) =>
    row.map((rho, j) => rho * holdings[i].volatility * holdings[j].volatility),
  );

  /*
    Cholesky can fail, and the failure is meaningful rather than a bug: a
    correlation matrix estimated from data of unequal lengths, or edited by
    hand, can describe relationships that are mutually impossible. Returning
    null lets the interface say so instead of rendering NaN.
  */
  const L = cholesky(covariance);
  if (!L) return null;

  const T = horizonDays / TRADING_DAYS;
  const sqrtT = Math.sqrt(T);
  const normal = normalStream(seededRandom(seed));
  const terminal = new Float64Array(paths);

  const z = new Float64Array(n);
  const shock = new Float64Array(n);

  for (let p = 0; p < paths; p++) {
    for (let i = 0; i < n; i++) z[i] = normal();

    // shock = L · z. L is lower triangular, so the inner loop stops at i.
    for (let i = 0; i < n; i++) {
      let acc = 0;
      for (let k = 0; k <= i; k++) acc += L[i][k] * z[k];
      shock[i] = acc;
    }

    let value = 0;
    for (let i = 0; i < n; i++) {
      const h = holdings[i];
      // The Itô correction uses the asset's OWN variance; the correlation is
      // already carried in `shock`, so it must not be applied twice.
      const growth = (h.drift - (h.volatility * h.volatility) / 2) * T;
      value += h.weight * notional * Math.exp(growth + shock[i] * sqrtT);
    }
    terminal[p] = value;
  }

  terminal.sort();

  const index = Math.max(0, Math.min(paths - 1, Math.floor(alpha * paths)));
  const varMonteCarlo = notional - terminal[index];

  const sigma = portfolioVolatility(holdings, correlations);
  const mu = holdings.reduce((s, h) => s + h.weight * h.drift, 0);
  const growth = (mu - (sigma * sigma) / 2) * T;
  const analyticQuantile = notional * Math.exp(growth + sigma * sqrtT * normalQuantile(alpha));
  const varAnalytic = notional - analyticQuantile;

  let tail = 0;
  for (let i = 0; i <= index; i++) tail += terminal[i];

  let below = 0;
  for (let i = 0; i < paths; i++) {
    if (terminal[i] < notional) below++;
    else break;
  }

  return {
    terminal,
    varMonteCarlo,
    varAnalytic,
    relativeError:
      varAnalytic === 0 ? 0 : Math.abs(varMonteCarlo - varAnalytic) / Math.abs(varAnalytic),
    expectedShortfall: notional - tail / (index + 1),
    probabilityOfLoss: below / paths,
    median: terminal[Math.floor(paths / 2)],
    histogram: bucket(terminal, 46),
    volatility: sigma,
    undiversified: undiversifiedVolatility(holdings),
    drift: mu,
  };
}
