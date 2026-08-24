/**
 * Cross-sectional alpha factors, from price and volume alone.
 *
 * Each function turns a price history into one number per stock per month: an
 * exposure. Nothing here predicts a price. The model that uses them ranks stocks
 * against each other and holds the spread, which is a different and far less
 * noisy question — see `lib/portfolio.ts`.
 *
 * ---
 *
 * WHY THERE ARE NO VALUATION FACTORS
 *
 * Return on equity, book-to-price and earnings yield are the other half of the
 * standard factor zoo, and they are absent on purpose.
 *
 * A valuation factor needs POINT-IN-TIME fundamentals — what the market knew on
 * the day, not what the filing was later restated to, and critically not what it
 * is today. The free sources publish a current snapshot. Ranking stocks in 2023
 * by a return-on-equity figure published in 2026 tells the model which companies
 * turned out to be good, which is not a prediction, it is the answer sheet.
 *
 * That single mistake is the most common way a factor backtest produces a
 * beautiful curve that cannot be traded. It is worth more to have five honest
 * factors than eight with a leak in them.
 *
 * Momentum and low-volatility, both computable from price alone, are also the
 * two most replicated anomalies in the literature — Jegadeesh & Titman (1993)
 * and the low-beta work following Black (1972). This is not a compromise set.
 *
 * ---
 *
 * EVERY FACTOR IS BACKWARD-LOOKING BY CONSTRUCTION
 *
 * A factor for month `t` may only read bars strictly before `t` begins. That is
 * enforced by the caller passing a slice that ends at the formation date, and
 * checked in the tests — but the shape of each function assumes it, so none of
 * them index forward.
 */

/** One daily bar of the universe. Volume drives the liquidity factors. */
export type Bar = {
  date: string;
  close: number;
  volume: number;
};

/** Trading days in a month, on average. Used to size the lookbacks. */
export const MONTH = 21;

/* ------------------------------------------------------------------ *
 * Building blocks
 * ------------------------------------------------------------------ */

/** Simple return between two prices. */
const ret = (from: number, to: number): number => (from > 0 ? to / from - 1 : 0);

export function mean(xs: number[]): number {
  return xs.length ? xs.reduce((s, v) => s + v, 0) / xs.length : 0;
}

export function stdev(xs: number[]): number {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  return Math.sqrt(xs.reduce((s, v) => s + (v - m) ** 2, 0) / (xs.length - 1));
}

/** Daily log returns. Logs so that summing them compounds correctly. */
export function logReturns(bars: Bar[]): number[] {
  const out: number[] = [];
  for (let i = 1; i < bars.length; i++) {
    const a = bars[i - 1].close;
    const b = bars[i].close;
    if (a > 0 && b > 0) out.push(Math.log(b / a));
  }
  return out;
}

/* ------------------------------------------------------------------ *
 * The factors
 * ------------------------------------------------------------------ */

/**
 * Twelve-month momentum, skipping the most recent month.
 *
 * The skip is not a detail. Momentum over 12 months is a real and persistent
 * effect; the most recent month runs the OTHER way — short-term reversal — and
 * including it partially cancels the signal you are trying to measure. Every
 * serious implementation since Jegadeesh & Titman uses 12-1 for this reason.
 */
export function momentum(bars: Bar[]): number {
  if (bars.length < 12 * MONTH + 1) return NaN;
  const end = bars.length - 1 - MONTH; // skip the last month
  const start = end - 11 * MONTH;
  if (start < 0) return NaN;
  return ret(bars[start].close, bars[end].close);
}

/**
 * Last month's return, which is the reversal leg.
 *
 * Entered with a NEGATIVE weight in the model: the stocks that ran hardest in
 * the last month tend to give some of it back. Kept as its own factor rather
 * than folded into momentum so the two effects stay separable.
 */
export function reversal(bars: Bar[]): number {
  if (bars.length < MONTH + 1) return NaN;
  return ret(bars[bars.length - 1 - MONTH].close, bars[bars.length - 1].close);
}

/**
 * Realised volatility over the last quarter, annualised.
 *
 * Entered NEGATIVE. The low-volatility anomaly — that boring stocks have
 * historically beaten exciting ones on a risk-adjusted basis, and often
 * outright — is one of the most robust findings in the field and the most
 * uncomfortable, because it contradicts the idea that return is paid for risk.
 */
export function volatility(bars: Bar[]): number {
  const window = bars.slice(-(3 * MONTH + 1));
  const rs = logReturns(window);
  if (rs.length < 30) return NaN;
  return stdev(rs) * Math.sqrt(252);
}

/**
 * Downside deviation: the same idea, but counting only the losses.
 *
 * Volatility punishes a stock for rising quickly, which no investor minds.
 * Semi-deviation measures the half of the distribution people actually care
 * about, and separates a stock that grinds upward from one that whipsaws.
 */
export function downside(bars: Bar[]): number {
  const rs = logReturns(bars.slice(-(3 * MONTH + 1)));
  if (rs.length < 30) return NaN;
  const losses = rs.filter((r) => r < 0);
  if (losses.length < 5) return 0;
  return Math.sqrt(mean(losses.map((r) => r * r))) * Math.sqrt(252);
}

/**
 * Beta against the equal-weighted universe.
 *
 * Not a predictive factor — a control. The portfolio is built to be market
 * neutral, and it cannot be neutralised against something that has not been
 * measured. `market` is the universe's own daily return series, so no external
 * index is needed and no index constituent list can go stale.
 */
export function beta(bars: Bar[], market: number[]): number {
  const rs = logReturns(bars.slice(-(12 * MONTH + 1)));
  const m = market.slice(-rs.length);
  if (rs.length < 60 || m.length !== rs.length) return NaN;

  const mm = mean(m);
  const rm = mean(rs);
  let cov = 0;
  let varm = 0;
  for (let i = 0; i < rs.length; i++) {
    cov += (m[i] - mm) * (rs[i] - rm);
    varm += (m[i] - mm) ** 2;
  }
  return varm > 0 ? cov / varm : NaN;
}

/**
 * Idiosyncratic volatility: the part of the movement the market does not explain.
 *
 * The residual standard deviation from the same regression beta comes from. A
 * stock with low idiosyncratic volatility is one whose story is mostly the
 * market's story, and that is a different claim from being quiet overall.
 */
export function idiosyncratic(bars: Bar[], market: number[]): number {
  const rs = logReturns(bars.slice(-(12 * MONTH + 1)));
  const m = market.slice(-rs.length);
  if (rs.length < 60 || m.length !== rs.length) return NaN;

  const b = beta(bars, market);
  if (!Number.isFinite(b)) return NaN;

  const alpha = mean(rs) - b * mean(m);
  const residuals = rs.map((r, i) => r - (alpha + b * m[i]));
  return stdev(residuals) * Math.sqrt(252);
}

/**
 * Amihud illiquidity: how far the price moves per dollar traded.
 *
 *     mean( |return| / dollar volume )
 *
 * A stock that lurches on small volume is expensive to trade and carries a
 * premium for it. This is the one factor here that is about market
 * microstructure rather than about the return series, and it is the reason
 * volume is fetched at all.
 *
 * RETURNED AS A LOG, for two reasons that turn out to be the same reason.
 *
 * The raw ratio is savagely right-skewed — a mega-cap trading twenty billion a
 * day and a small name trading fifty million differ by three orders of
 * magnitude, so a handful of names carry the entire cross-sectional variance and
 * everything else standardises to approximately zero. Taking logs turns a
 * multiplicative spread into an additive one, which is the scale the ranking
 * actually wants.
 *
 * It also fixes a quieter problem. Raw Amihud on these names lands near 1e-12;
 * stored at any sane precision that rounds to zero and the factor silently stops
 * existing. It did exactly that here before the log went in — every stock scored
 * 0.000001 and the illiquidity leg contributed nothing at all.
 */
export function illiquidity(bars: Bar[]): number {
  const window = bars.slice(-(3 * MONTH + 1));
  const values: number[] = [];
  for (let i = 1; i < window.length; i++) {
    const dollars = window[i].close * window[i].volume;
    if (dollars <= 0) continue;
    values.push(Math.abs(ret(window[i - 1].close, window[i].close)) / dollars);
  }
  if (values.length < 30) return NaN;
  const amihud = mean(values);
  return amihud > 0 ? Math.log(amihud) : NaN;
}

/* ------------------------------------------------------------------ *
 * The panel
 * ------------------------------------------------------------------ */

/** Factor names, in the order they appear in an exposure row. */
export const FACTORS = [
  'momentum',
  'reversal',
  'volatility',
  'downside',
  'beta',
  'idiosyncratic',
  'illiquidity',
] as const;

export type FactorName = (typeof FACTORS)[number];

/**
 * The sign each factor is expected to carry into the score.
 *
 * DECLARED, not fitted. A model that learns the sign of every factor from the
 * same data it is tested on will happily decide that high volatility predicts
 * high returns, because in some windows it did. These are the directions the
 * published literature supports, fixed in advance — and if the backtest
 * disagrees with one, that is a result worth reading rather than a parameter
 * worth flipping.
 */
export const DIRECTION: Record<FactorName, number> = {
  momentum: +1,
  reversal: -1,
  volatility: -1,
  downside: -1,
  beta: 0, // a control, neutralised rather than bet on
  idiosyncratic: -1,
  illiquidity: +1,
};

/** Every factor for one stock, at one formation date. */
export function exposures(bars: Bar[], market: number[]): Record<FactorName, number> {
  return {
    momentum: momentum(bars),
    reversal: reversal(bars),
    volatility: volatility(bars),
    downside: downside(bars),
    beta: beta(bars, market),
    idiosyncratic: idiosyncratic(bars, market),
    illiquidity: illiquidity(bars),
  };
}
