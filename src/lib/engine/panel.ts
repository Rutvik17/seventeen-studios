/**
 * The training panel: one row per name per day, features on the left, the thing
 * we are trying to predict on the right.
 *
 * ---
 * WHAT THE MODEL PREDICTS, AND WHY IT IS RELATIVE
 *
 * The target is the name's return over the next `HORIZON` trading days MINUS
 * SPY's return over the same days.
 *
 * Predicting raw return would mostly be predicting the market, which is close to
 * unpredictable and which we are not trying to forecast anyway — the strategy
 * carries market exposure deliberately, sized by the risk engine. What has to be
 * predicted is the part that is specific to the company. Beating SPY means
 * holding names that beat SPY, so that is what the label measures.
 *
 * ---
 * WHERE LOOK-AHEAD BIAS ENTERS, AND HOW IT IS SHUT OUT
 *
 * Three doors, all of them shut here rather than trusted to be shut elsewhere.
 *
 * 1. THE LABEL. Row `i` is labelled with the return from `i` to `i + HORIZON`.
 *    That return is in the future at prediction time, which is correct for
 *    training and fatal if the row is ever used for prediction. The last
 *    HORIZON rows of every series carry no label at all rather than a truncated
 *    one, so nothing can silently score a partial window.
 *
 * 2. THE FEATURES. Every technical column is computed from bars `0..i`. That is
 *    enforced in `technical.ts`, one function at a time.
 *
 * 3. THE CALENDAR. Names list, halt and get acquired on different days, so a
 *    positional index into two different series is not the same day. Everything
 *    is joined on the date string.
 *
 * ---
 * WHY ROWS ARE SHUFFLED-BY-DATE AND NOT BY ROW
 *
 * The train/test split is a DATE cut, never a random row split. Two rows for the
 * same name a day apart share almost all of their feature values and overlapping
 * label windows; splitting them randomly puts near-copies of the test set into
 * training and produces a model that looks excellent and cannot trade. This is
 * the single most common way an equity ML backtest lies.
 */

import {
  TECHNICAL_COLUMNS,
  logReturns,
  technicalFeatures,
  type Bar,
} from './technical';

/** Trading days ahead the model is asked to predict. One month. */
export const HORIZON = 21;

export type UniverseEntry = {
  symbol: string;
  name: string;
  cik: string;
  sector: string;
  industry: string;
};

export type PriceData = {
  benchmark: string;
  universe: UniverseEntry[];
  bars: Record<string, Bar[]>;
};

export type PanelRow = {
  /** Index into `panel.dates`. */
  t: number;
  /** Index into `panel.symbols`. */
  s: number;
  features: number[];
  /** Forward excess return over SPY. NaN where the future is not yet known. */
  label: number;
};

export type Panel = {
  dates: string[];
  symbols: string[];
  industries: string[];
  columns: string[];
  rows: PanelRow[];
  /** Benchmark close per date index, for the backtest and the regime model. */
  benchmarkClose: number[];
};

/**
 * Forward excess return, aligned to a shared calendar.
 *
 * `at` maps a date index to a bar index for this name, or -1 when the name did
 * not trade that day. Both legs must exist at both ends or the row is unlabelled
 * — a name that was halted for the back half of the window has a return that
 * means something other than what the model would learn from it.
 */
function forwardExcess(
  bars: Bar[],
  at: Int32Array,
  benchClose: number[],
  horizon: number,
): number[] {
  const out = new Array<number>(at.length).fill(NaN);
  for (let t = 0; t + horizon < at.length; t++) {
    const i = at[t];
    const j = at[t + horizon];
    if (i < 0 || j < 0) continue;
    const a = bars[i].c;
    const b = bars[j].c;
    const ma = benchClose[t];
    const mb = benchClose[t + horizon];
    if (!(a > 0) || !(b > 0) || !(ma > 0) || !(mb > 0)) continue;
    out[t] = b / a - (mb / ma);
  }
  return out;
}

export function buildPanel(data: PriceData, horizon = HORIZON): Panel {
  const bench = data.bars[data.benchmark];
  if (!bench?.length) throw new Error('no benchmark bars');

  /*
    THE BENCHMARK'S CALENDAR IS THE CALENDAR.

    Using the union of every name's dates would invent days the market was shut
    for names with bad data, and a forward return measured across a fabricated
    day is wrong in a way nothing downstream would catch. SPY traded every day
    the US market was open, so its dates are the market's dates.
  */
  const dates = bench.map((b) => b.d);
  const dateIndex = new Map(dates.map((d, i) => [d, i]));
  const benchmarkClose = bench.map((b) => b.c);
  const market = logReturns(bench);

  const symbols: string[] = [];
  const industries: string[] = [];
  const rows: PanelRow[] = [];

  for (const entry of data.universe) {
    const bars = data.bars[entry.symbol];
    if (!bars || bars.length < 260) continue;

    // Where each calendar date sits in this name's own bar array, or -1.
    const at = new Int32Array(dates.length).fill(-1);
    for (let i = 0; i < bars.length; i++) {
      const t = dateIndex.get(bars[i].d);
      if (t !== undefined) at[t] = i;
    }

    // The market leg has to be on the NAME's bar indices to regress against it.
    const marketForName = new Array<number>(bars.length).fill(NaN);
    for (let t = 0; t < dates.length; t++) {
      const i = at[t];
      if (i >= 0) marketForName[i] = market[t];
    }

    const features = technicalFeatures(bars, marketForName);
    const labels = forwardExcess(bars, at, benchmarkClose, horizon);

    const s = symbols.length;
    symbols.push(entry.symbol);
    industries.push(entry.industry);

    for (let t = 0; t < dates.length; t++) {
      const i = at[t];
      if (i < 0) continue;
      const f = features[i];
      /*
        A row with no usable features is not a row. Requiring most of them
        present drops the first year of every name's life, which is exactly
        where the long-window features are undefined.
      */
      let known = 0;
      for (const v of f) if (Number.isFinite(v)) known++;
      if (known < f.length * 0.7) continue;
      rows.push({ t, s, features: f, label: labels[t] });
    }
  }

  return {
    dates,
    symbols,
    industries,
    columns: [...TECHNICAL_COLUMNS],
    rows,
    benchmarkClose,
  };
}

/**
 * Cross-sectional rank-normalisation, within industry, one date at a time.
 *
 * Two separate jobs, both necessary.
 *
 * The RANK part: raw feature levels drift for reasons that have nothing to do
 * with the cross-section. Volatility in 2020 was three times its 2017 level for
 * every name at once, so a tree that split on raw volatility would mostly be
 * splitting on the year. Converting to a within-date rank asks the only question
 * that transfers across time: high or low COMPARED TO WHAT ELSE WAS AVAILABLE
 * THAT DAY.
 *
 * The INDUSTRY part: ranking a semiconductor's momentum against a utility's
 * measures the sector rotation, not the company. That is a bet available for
 * nothing in a sector ETF and it is the first thing to break when leadership
 * changes.
 *
 * Output is centred on zero and spans roughly [-0.5, 0.5], so every column
 * arrives at the model on the same scale with outliers already compressed.
 */
export function rankNormalise(panel: Panel): void {
  const byDate = new Map<number, PanelRow[]>();
  for (const row of panel.rows) {
    let list = byDate.get(row.t);
    if (!list) byDate.set(row.t, (list = []));
    list.push(row);
  }

  const columnCount = panel.columns.length;

  for (const list of byDate.values()) {
    const groups = new Map<string, PanelRow[]>();
    for (const row of list) {
      const key = panel.industries[row.s];
      let g = groups.get(key);
      if (!g) groups.set(key, (g = []));
      g.push(row);
    }

    for (const group of groups.values()) {
      /*
        Below this, a rank is not a measurement. In a bucket of three the ranks
        are -0.5, 0 and 0.5 whatever the underlying values were, which is noise
        wearing a feature's name. Those rows keep NaN and the trees route them
        down a learned missing-value branch instead.
      */
      if (group.length < 5) {
        for (const row of group) row.features = new Array(columnCount).fill(NaN);
        continue;
      }

      for (let c = 0; c < columnCount; c++) {
        const present = group
          .map((row, k) => ({ k, v: row.features[c] }))
          .filter((o) => Number.isFinite(o.v))
          .sort((a, b) => a.v - b.v);

        if (present.length < 5) {
          for (const row of group) row.features[c] = NaN;
          continue;
        }

        const n = present.length;
        // Ties share the average of the ranks they span, so a column that is
        // constant across the group lands on zero rather than on an arbitrary
        // ordering of equal values.
        let i = 0;
        while (i < n) {
          let j = i;
          while (j + 1 < n && present[j + 1].v === present[i].v) j++;
          const rank = (i + j) / 2;
          const scaled = n > 1 ? rank / (n - 1) - 0.5 : 0;
          for (let k = i; k <= j; k++) group[present[k].k].features[c] = scaled;
          i = j + 1;
        }
      }
    }
  }
}
