import raw from './market.json';

/**
 * Real market data, fetched at build time.
 *
 * ---
 *
 * WHERE THIS COMES FROM
 *
 * `scripts/fetch-market.mjs` pulls two years of adjusted daily closes from
 * Yahoo's chart API and writes `market.json`. It runs as `prebuild`, so every
 * deploy carries fresh figures, and the workflow rebuilds each weekday evening
 * after the US close.
 *
 * It is NOT fetched in the browser, and that is not a shortcut. The site is a
 * static export with no server, and Yahoo sends no CORS headers — a call from
 * the page is blocked before any of our code runs. Doing it at build time is
 * the only way to have real prices on a static host without standing up a
 * proxy, and it has the side benefit that the numbers cannot change under a
 * reader mid-sentence.
 *
 * ---
 *
 * WHAT THE FIGURES MEAN
 *
 * `drift` and `volatility` are ANNUALISED, from daily log returns. Log returns
 * because they add up over time — a year's worth summed is exactly the year's
 * return — which is what makes multiplying by 252 and √252 legitimate. Simple
 * returns do not add (a +10% day then a −10% day is −1%, not 0%), so
 * annualising their spread is subtly wrong and is the most common error in
 * hand-written volatility code.
 *
 * Both are backward-looking descriptions of what happened, not forecasts.
 * Anything on this site that consumes them says so.
 */

export type Asset = {
  symbol: string;
  name: string;
  /** Latest adjusted close, in USD. */
  price: number;
  /** The session this close belongs to, ISO date. */
  asOf: string;
  /** Annualised expected simple return, as a decimal. 0.28 is 28%. */
  drift: number;
  /** Annualised standard deviation of returns, as a decimal. */
  volatility: number;
  /** Daily log returns used, after dropping halted sessions. */
  observations: number;
  changeDay: number | null;
  changeMonth: number | null;
  changeYear: number | null;
  /** Downsampled closes for a sparkline. */
  spark: number[];
  /** The model's current reading for this name. */
  sentiment?: Sentiment | null;
};

/**
 * The companion's sentiment model, fitted at build time.
 *
 * A logistic regression over four price-derived features, trained by gradient
 * descent on all six names and evaluated on a chronological hold-out. The
 * weights ship; the training set does not.
 *
 * `test.accuracy` is reported against `test.baseRate` — the score you get by
 * always guessing the majority class — rather than against 50%. Markets drift
 * upward, so the base rate is already above half, and any evaluation measured
 * against 50% is flattering itself.
 */
export type SentimentModel = {
  kind: string;
  featureNames: string[];
  weights: number[];
  bias: number;
  mean: number[];
  std: number[];
  train: Scores;
  test: Scores;
  /** Reliability on unseen data: does it mean what it says? */
  calibration: { predicted: number; actual: number; n: number }[];
  /** Quantiles of its own output, so a percentile can be taken. */
  quantiles: number[];
};

export type Scores = {
  accuracy: number;
  logLoss: number;
  baseRate: number;
  upShare: number;
  n: number;
};

/** One asset's current reading. */
export type Sentiment = {
  probability: number;
  /** Where that sits in the model's own output range, 0 to 1. */
  percentile: number;
  features: number[];
};

export type MarketData = {
  fetchedAt: string;
  /**
   * Pairwise correlation of daily log returns, in `assets` order.
   *
   * This is what makes the risk desk a portfolio rather than six separate bets.
   * Two assets that move together give almost no risk reduction when combined;
   * two that do not give a combined swing smaller than either alone. All of that
   * effect lives in this matrix.
   *
   * Aligned on shared session dates, not by array index — Rocket Lab listed
   * years after Alphabet, so index 0 of one series is a different day from index
   * 0 of the other, and lining them up by position correlates unrelated dates.
   */
  correlations: number[][];
  /** Sessions the matrix is measured over — set by the most recently listed name. */
  correlationSessions: number;
  sentiment: SentimentModel | null;
  tradingDays: number;
  window: string;
  source: string;
  assets: Asset[];
};

export const market = raw as MarketData;

export const assetBySymbol = (symbol: string): Asset | undefined =>
  market.assets.find((a) => a.symbol === symbol);

/**
 * How the companion should feel about a move.
 *
 * Bands are in units of the asset's OWN daily volatility, not fixed
 * percentages — which is the only way this can be honest across these six
 * names. A 3% day is unremarkable for Rocket Lab at 92% annualised and a
 * significant event for Alphabet at 32%; a fixed threshold would have Mochi
 * permanently alarmed about one and asleep through the other.
 *
 * Daily sigma is the annual figure divided by √252, because variance adds with
 * time and standard deviation therefore grows with its square root.
 */
export function sigmasFor(asset: Asset, changePercent: number, tradingDays = 252): number {
  const dailySigma = (asset.volatility / Math.sqrt(tradingDays)) * 100;
  return dailySigma === 0 ? 0 : changePercent / dailySigma;
}
