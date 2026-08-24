/**
 * The walk-forward backtest.
 *
 * Each month: score the universe on last month's data, rank it, take the extremes,
 * size them by mean-variance, hold for a month, and record what actually happened.
 * Then move forward one month and do it again, never once looking at a price the
 * model would not have had.
 *
 * ---
 *
 * WHY IT WALKS FORWARD RATHER THAN FITTING
 *
 * The obvious way to build this is to fit factor weights over the whole history
 * and report the result. It produces a beautiful curve and it means nothing: the
 * weights were chosen knowing which factors worked, so the "backtest" is the
 * in-sample fit of a model to its own answer sheet.
 *
 * Nothing here is fitted. Factor directions are declared in advance from the
 * published literature, the weights are equal, and every decision at month t
 * uses only data that existed at month t. The covariance is estimated from a
 * trailing window that ends before the month being predicted.
 *
 * That is what "re-estimated daily by a cron job" should mean, and it is a
 * different thing from a model that learns from its own backtest results. A
 * model retrained on how its own trades turned out will reliably discover the
 * exact path the market took and report a curve nobody could have traded.
 *
 * ---
 *
 * WHAT IS NOT MODELLED, AND WHY EACH ONE FLATTERS
 *
 * Transaction costs. A long-short book rebalanced monthly turns over a large
 * fraction of itself every month, and at institutional commissions plus spread
 * plus market impact that is a real drag. `turnover` is reported so the size of
 * the omission is visible, and `costBps` applies a flat estimate.
 *
 * Borrow costs on the short book, which are small for large caps and not zero.
 *
 * Survivorship. The universe is companies that exist today. See the note in
 * `scripts/fetch-universe.mjs` — it flatters the long side by an unknown amount.
 */

import { FACTORS, type FactorName } from './factors';
import {
  OPTIMISER,
  compositeScores,
  covariance,
  optimise,
  type OptimiserOptions,
} from './portfolio';

export type PanelMonth = {
  date: string;
  /** One row per universe member, aligned to `symbols`; null when unavailable. */
  rows: (number[] | null)[];
};

export type AlphaInput = {
  symbols: string[];
  industries: string[];
  monthEnds: string[];
  /** Month-end closes per symbol, aligned to `monthEnds`. */
  closes: Record<string, (number | null)[]>;
  months: PanelMonth[];
};

export type AlphaOptions = OptimiserOptions & {
  /** Fraction of the universe taken on each side. 0.1 is the top and bottom decile. */
  decile: number;
  /** Months of trailing returns used to estimate the covariance. */
  lookback: number;
  /** Round-trip cost per unit of turnover, in basis points. */
  costBps: number;
};

export const ALPHA: AlphaOptions = {
  ...OPTIMISER,
  decile: 0.1,
  lookback: 24,
  costBps: 10,
};

export type Holding = {
  symbol: string;
  weight: number;
  score: number;
  /** Realised return of the name over the held month. */
  ret: number;
};

export type MonthResult = {
  /** The month the positions were formed on. */
  formed: string;
  /** The month they were held into. */
  held: string;
  /** Return before costs. */
  gross: number;
  /** Return after the turnover charge. */
  net: number;
  /** Fraction of the book replaced since last month. */
  turnover: number;
  /** Net beta of the book — should be near zero. */
  netBeta: number;
  longs: Holding[];
  shorts: Holding[];
  degenerate: boolean;
};

export type AlphaResult = {
  months: MonthResult[];
  /** Growth of one unit, after costs, one point per month plus the start. */
  curve: number[];
  metrics: {
    months: number;
    totalReturn: number;
    annualised: number;
    volatility: number;
    sharpe: number;
    maxDrawdown: number;
    hitRate: number;
    averageTurnover: number;
    /** Months where the covariance could not be inverted even after shrinkage. */
    degenerate: number;
  };
};

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

function stdev(xs: number[]): number {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  return Math.sqrt(xs.reduce((s, v) => s + (v - m) ** 2, 0) / (xs.length - 1));
}

/** Monthly simple returns per symbol, aligned to `monthEnds` with a leading null. */
function monthlyReturns(input: AlphaInput): Record<string, (number | null)[]> {
  const out: Record<string, (number | null)[]> = {};
  for (const symbol of input.symbols) {
    const closes = input.closes[symbol] ?? [];
    out[symbol] = closes.map((close, i) => {
      const prev = i > 0 ? closes[i - 1] : null;
      if (prev == null || close == null || prev <= 0) return null;
      return close / prev - 1;
    });
  }
  return out;
}

export function runAlpha(input: AlphaInput, options: AlphaOptions = ALPHA): AlphaResult {
  const returns = monthlyReturns(input);
  const monthIndex = new Map(input.monthEnds.map((d, i) => [d, i]));

  const results: MonthResult[] = [];
  let previous = new Map<string, number>();

  for (const month of input.months) {
    const formedAt = monthIndex.get(month.date);
    if (formedAt === undefined || formedAt + 1 >= input.monthEnds.length) continue;
    const heldDate = input.monthEnds[formedAt + 1];

    // Only names with a full exposure row AND a realised return to score against.
    const live: { i: number; symbol: string; row: number[] }[] = [];
    month.rows.forEach((row, i) => {
      if (!row || row.some((v) => v == null || !Number.isFinite(v))) return;
      const symbol = input.symbols[i];
      if (returns[symbol]?.[formedAt + 1] == null) return;
      live.push({ i, symbol, row });
    });
    if (live.length < 30) continue;

    const panel = live.map((entry) => {
      const record = {} as Record<FactorName, number>;
      FACTORS.forEach((f, k) => {
        record[f] = entry.row[k];
      });
      return record;
    });

    const industries = live.map((entry) => input.industries[entry.i]);
    const { score } = compositeScores(panel, industries);

    /*
      Rank, then take the extremes.

      The middle of the distribution is dropped entirely. A cross-sectional model
      claims to know the ORDER, not the level — the confident part of that claim
      is at the ends, and a stock ranked 130th of 255 carries no information the
      model would bet on.
    */
    const ranked = live.map((entry, k) => ({ ...entry, score: score[k] }));
    ranked.sort((a, b) => b.score - a.score);

    const side = Math.max(3, Math.floor(ranked.length * options.decile));
    const longs = ranked.slice(0, side);
    const shorts = ranked.slice(-side);
    const selected = [...longs, ...shorts];

    /*
      Covariance from a TRAILING window that ends before the held month.

      `formedAt` is the formation date, so the slice stops there. Including the
      month being predicted would let the optimiser size positions using the
      correlations that were about to occur, which is the subtle version of
      look-ahead — it does not touch the returns, only the risk model, and it
      still produces a curve nobody could have traded.
    */
    const start = Math.max(1, formedAt - options.lookback + 1);
    const history = selected.map((entry) => {
      const series = returns[entry.symbol] ?? [];
      const window: number[] = [];
      for (let k = start; k <= formedAt; k++) window.push(series[k] ?? 0);
      return window;
    });

    const betas = selected.map((entry) => entry.row[FACTORS.indexOf('beta')]);
    const alpha = selected.map((entry) => entry.score);

    const allocation = optimise(alpha, covariance(history), betas, options);

    // Realised return of the book over the held month.
    let gross = 0;
    const holdings: Holding[] = selected.map((entry, k) => {
      const realised = returns[entry.symbol]?.[formedAt + 1] ?? 0;
      const weight = allocation.weights[k] ?? 0;
      gross += weight * realised;
      return { symbol: entry.symbol, weight, score: entry.score, ret: realised };
    });

    /*
      Turnover: how much of the book had to be traded to get here.

      Measured as half the sum of absolute weight changes, which is the standard
      convention — buying 5% of a name and selling 5% of another is 5% turnover,
      not 10%.
    */
    const now = new Map(holdings.map((h) => [h.symbol, h.weight]));
    const names = new Set([...now.keys(), ...previous.keys()]);
    let churn = 0;
    for (const name of names) churn += Math.abs((now.get(name) ?? 0) - (previous.get(name) ?? 0));
    const turnover = churn / 2;
    previous = now;

    results.push({
      formed: month.date,
      held: heldDate,
      gross,
      net: gross - (turnover * options.costBps) / 10_000,
      turnover,
      netBeta: allocation.netBeta,
      longs: holdings.filter((h) => h.weight > 0).sort((a, b) => b.weight - a.weight),
      shorts: holdings.filter((h) => h.weight < 0).sort((a, b) => a.weight - b.weight),
      degenerate: allocation.degenerate,
    });
  }

  const nets = results.map((r) => r.net);
  const curve = [1];
  for (const r of nets) curve.push(curve[curve.length - 1] * (1 + r));

  let peak = -Infinity;
  let worst = 0;
  for (const value of curve) {
    peak = Math.max(peak, value);
    worst = Math.max(worst, (peak - value) / peak);
  }

  const monthlyVol = stdev(nets);
  const total = curve[curve.length - 1] - 1;
  const years = results.length / 12;

  return {
    months: results,
    curve,
    metrics: {
      months: results.length,
      totalReturn: total,
      annualised: years > 0 ? (1 + total) ** (1 / years) - 1 : 0,
      volatility: monthlyVol * Math.sqrt(12),
      /*
        Annualised Sharpe of the monthly series, with no risk-free rate: this is a
        long-short book that is dollar neutral, so it holds roughly no net cash
        position to earn one on. Subtracting a rate here would be double-counting.
      */
      sharpe: monthlyVol > 0 ? (mean(nets) / monthlyVol) * Math.sqrt(12) : 0,
      maxDrawdown: worst,
      hitRate: results.length ? nets.filter((r) => r > 0).length / results.length : 0,
      averageTurnover: mean(results.map((r) => r.turnover)),
      degenerate: results.filter((r) => r.degenerate).length,
    },
  };
}
