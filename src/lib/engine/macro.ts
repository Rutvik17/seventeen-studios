/**
 * Macro features: rates, credit, volatility, commodities, and event proximity.
 *
 * ---
 * THE TRAP THAT MAKES MACRO USELESS IF YOU MISS IT
 *
 * Every value here is CROSS-SECTIONALLY CONSTANT. On 2022-06-15 the fed funds
 * rate is the same number for all 503 companies.
 *
 * The stock panel rank-normalises each feature within date and industry, which
 * is what stops the model learning the year instead of the company. Push a macro
 * column through that and every name receives an identical rank, the column
 * becomes a constant, and it carries exactly zero information. Dropping macro
 * into the selection model the obvious way does literally nothing — and it does
 * nothing SILENTLY, which is worse, because the feature is present, the model
 * trains, and the importances just quietly read zero.
 *
 * So macro columns are exempt from rank-normalisation and passed through raw.
 * That is what lets a tree learn the thing worth learning: a split on
 * `vix > 28` sitting above a split on `beta_rank > 0.3` IS an interaction —
 * "high-beta names when volatility is elevated" — expressed in two nodes. The
 * interactions do not need to be hand-constructed, they only need the raw level
 * to be reachable.
 *
 * ---
 * EVENT PROXIMITY WITHOUT LOOK-AHEAD
 *
 * `daysToFomc` looks like it reads the future and does not. The Fed publishes
 * its meeting calendar about a year ahead, so on any given day the date of the
 * next meeting is public knowledge. Knowing WHEN the announcement lands is not
 * the same as knowing WHAT it says.
 *
 * The line is: the schedule is a feature, the outcome is not. Nothing here reads
 * a decision, a released figure, or a surprise-versus-consensus. And the
 * market's own anticipation is already present in VIX, which is a 30-day
 * forward-looking measure priced from options — today's VIX is simultaneously
 * point-in-time honest and forward-looking, which is exactly what event risk
 * wants.
 */

export type MacroData = {
  series: Record<string, Record<string, number>>;
  fomc: string[];
};

export const MACRO_COLUMNS = [
  // Level and direction of policy and the curve.
  'y10', 'y10_chg_21', 'curve_2s10s', 'curve_3m10y', 'real_yield', 'fed_funds_chg_63',
  // The price of credit risk — the cleanest single regime gauge there is.
  'credit_spread', 'credit_spread_chg_21',
  // The volatility complex. MOVE and VVIX lead VIX at turning points.
  'vix', 'vix_chg_21', 'vix_pctile_252', 'vvix', 'move',
  // Growth versus fear, and inflation heat.
  'copper_gold', 'copper_gold_chg_63', 'oil_chg_63', 'dollar_chg_63',
  // Where the market itself is, which the regime engine needs most.
  'spy_vs_200d', 'spy_vol_21', 'spy_drawdown',
  // Scheduled event proximity. Published in advance, therefore fair.
  'days_to_fomc', 'days_since_fomc', 'fomc_blackout',
] as const;

/** Most recent value at or before `date`, walking a sorted key list. */
function asOf(series: Record<string, number>, keys: string[], cursor: { i: number }, date: string): number {
  while (cursor.i + 1 < keys.length && keys[cursor.i + 1] <= date) cursor.i++;
  if (cursor.i < 0 || keys[cursor.i] > date) return NaN;
  return series[keys[cursor.i]];
}

/**
 * Every macro column, aligned to `dates`.
 *
 * `benchmarkClose` is SPY on the same calendar — the market's own trend,
 * volatility and drawdown are the regime engine's most direct inputs and they
 * belong here rather than in the per-stock technicals.
 */
export function macroFeatures(
  macro: MacroData,
  dates: string[],
  benchmarkClose: number[],
): number[][] {
  const keysOf: Record<string, string[]> = {};
  const cursors: Record<string, { i: number }> = {};
  for (const [name, series] of Object.entries(macro.series)) {
    keysOf[name] = Object.keys(series).sort();
    cursors[name] = { i: -1 };
  }

  /** A series read forward across `dates`, so each lookup is O(1) amortised. */
  const walk = (name: string): number[] => {
    const series = macro.series[name];
    if (!series) return new Array(dates.length).fill(NaN);
    const keys = keysOf[name];
    const cursor = { i: -1 };
    return dates.map((d) => asOf(series, keys, cursor, d));
  };

  const y10 = walk('y10');
  const y2 = walk('y2');
  const y3m = walk('y3m');
  const fedFunds = walk('fedFunds');
  const breakeven = walk('breakeven10');
  const credit = walk('creditSpread');
  const vix = walk('vix');
  const vvix = walk('vvix');
  const move = walk('move');
  const copper = walk('copper');
  const gold = walk('gold');
  const wti = walk('wti');
  const dollar = walk('dollar');

  /** Change in level over `span` days — for a rate, a difference not a ratio. */
  const diff = (xs: number[], span: number) =>
    xs.map((v, i) => (i >= span && Number.isFinite(v) && Number.isFinite(xs[i - span]) ? v - xs[i - span] : NaN));

  /** Percentage change over `span` days — for a price. */
  const pct = (xs: number[], span: number) =>
    xs.map((v, i) => (i >= span && Number.isFinite(v) && xs[i - span] > 0 ? v / xs[i - span] - 1 : NaN));

  const y10Chg = diff(y10, 21);
  const fedChg = diff(fedFunds, 63);
  const creditChg = diff(credit, 21);
  const vixChg = diff(vix, 21);

  /*
    VIX as a percentile of its own trailing year rather than only as a level.

    A VIX of 20 meant something very different in 2017, when it had not been
    above 15 for months, from what it meant in 2020. The percentile asks "is
    this high FOR THIS REGIME", which is the question that transfers across time.
  */
  const vixPct = vix.map((v, i) => {
    if (i < 252 || !Number.isFinite(v)) return NaN;
    let below = 0;
    let n = 0;
    for (let k = i - 251; k <= i; k++) {
      if (!Number.isFinite(vix[k])) continue;
      n++;
      if (vix[k] <= v) below++;
    }
    return n > 50 ? below / n : NaN;
  });

  const copperGold = copper.map((c, i) => (Number.isFinite(c) && gold[i] > 0 ? c / gold[i] : NaN));
  const cgChg = pct(copperGold, 63);
  const oilChg = pct(wti, 63);
  const dollarChg = pct(dollar, 63);

  // The market's own trend, volatility and drawdown, from the benchmark.
  const spyVs200 = benchmarkClose.map((c, i) => {
    if (i < 200) return NaN;
    let sum = 0;
    for (let k = i - 199; k <= i; k++) sum += benchmarkClose[k];
    const avg = sum / 200;
    return avg > 0 ? c / avg - 1 : NaN;
  });

  const spyVol: number[] = new Array(dates.length).fill(NaN);
  {
    const r = benchmarkClose.map((c, i) => (i > 0 && benchmarkClose[i - 1] > 0 ? Math.log(c / benchmarkClose[i - 1]) : NaN));
    let sum = 0; let sumsq = 0; let n = 0;
    for (let i = 0; i < r.length; i++) {
      if (Number.isFinite(r[i])) { sum += r[i]; sumsq += r[i] * r[i]; n++; }
      const drop = i - 21;
      if (drop >= 0 && Number.isFinite(r[drop])) { sum -= r[drop]; sumsq -= r[drop] * r[drop]; n--; }
      if (i >= 21 && n > 15) {
        const variance = (sumsq - (sum * sum) / n) / (n - 1);
        if (variance > 0) spyVol[i] = Math.sqrt(variance) * Math.sqrt(252);
      }
    }
  }

  const spyDrawdown: number[] = new Array(dates.length).fill(NaN);
  {
    let peak = -Infinity;
    for (let i = 0; i < benchmarkClose.length; i++) {
      peak = Math.max(peak, benchmarkClose[i]);
      spyDrawdown[i] = peak > 0 ? (peak - benchmarkClose[i]) / peak : NaN;
    }
  }

  /*
    FOMC proximity. The calendar is published about a year ahead, so both
    directions are knowable on the day — this reads a schedule, never an outcome.

    The blackout is the week before a meeting, when officials stop speaking
    publicly. It is a genuinely different tape: no policy headlines can arrive,
    and positioning ahead of the decision dominates.
  */
  const meetings = [...macro.fomc].sort();
  const daysToFomc: number[] = [];
  const daysSinceFomc: number[] = [];
  const blackout: number[] = [];
  let m = 0;
  for (const d of dates) {
    while (m < meetings.length && meetings[m] < d) m++;
    const next = meetings[m];
    const prev = m > 0 ? meetings[m - 1] : null;
    const day = 86_400_000;
    const to = next ? Math.round((new Date(next).getTime() - new Date(d).getTime()) / day) : NaN;
    const since = prev ? Math.round((new Date(d).getTime() - new Date(prev).getTime()) / day) : NaN;
    daysToFomc.push(to);
    daysSinceFomc.push(since);
    blackout.push(Number.isFinite(to) && to <= 10 && to >= 0 ? 1 : 0);
  }

  const columns = [
    y10, y10Chg,
    y10.map((v, i) => (Number.isFinite(v) && Number.isFinite(y2[i]) ? v - y2[i] : NaN)),
    y10.map((v, i) => (Number.isFinite(v) && Number.isFinite(y3m[i]) ? v - y3m[i] : NaN)),
    y10.map((v, i) => (Number.isFinite(v) && Number.isFinite(breakeven[i]) ? v - breakeven[i] : NaN)),
    fedChg,
    credit, creditChg,
    vix, vixChg, vixPct, vvix, move,
    copperGold, cgChg, oilChg, dollarChg,
    spyVs200, spyVol, spyDrawdown,
    daysToFomc, daysSinceFomc, blackout,
  ];

  if (columns.length !== MACRO_COLUMNS.length) {
    throw new Error(`macro: ${columns.length} columns but ${MACRO_COLUMNS.length} names`);
  }
  return dates.map((_, i) => columns.map((col) => col[i]));
}
