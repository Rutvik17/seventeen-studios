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
import {
  FUNDAMENTAL_COLUMNS,
  fundamentalFeatures,
  type Facts,
} from './fundamental';
import { MACRO_COLUMNS, macroFeatures, type MacroData } from './macro';

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
  /**
   * How many leading columns get cross-sectionally ranked.
   *
   * Everything after this index is macro: identical across names on any given
   * day, so ranking it would flatten it to a constant and silently delete it.
   * Those columns pass through raw, which is what lets a tree put `vix > 28`
   * above `beta_rank > 0.3` and express an interaction in two nodes.
   */
  rankableColumns: number;
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

export type PanelOptions = {
  horizon?: number;
  /**
   * Per-symbol SEC facts. Omit to build a price-only panel.
   *
   * Kept optional so the two feature sets can be measured against each other on
   * IDENTICAL folds — same dates, same embargo, same seed, one variable changed.
   * Any other comparison is an opinion.
   */
  fundamentals?: Record<string, Facts>;
  /** Rates, credit, volatility, commodities and the FOMC calendar. */
  macro?: MacroData;
};

export function buildPanel(data: PriceData, options: PanelOptions = {}): Panel {
  const horizon = options.horizon ?? HORIZON;
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

  /*
    Computed ONCE, outside the per-name loop. Macro does not vary by company, so
    recomputing it 500 times would be 500 identical passes over 4,207 dates.
  */
  const macroRows = options.macro
    ? macroFeatures(options.macro, dates, benchmarkClose)
    : null;

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

    /*
      Fundamentals are indexed by CALENDAR date; technicals by the name's own bar
      index. They are different axes and mixing them up would silently pair a
      company's Tuesday prices with someone else's Thursday filings. Each row is
      assembled from `features[i]` and `funda[t]` explicitly.
    */
    const funda = options.fundamentals
      ? fundamentalFeatures(options.fundamentals[entry.symbol] ?? {}, dates)
      : null;

    const s = symbols.length;
    symbols.push(entry.symbol);
    industries.push(entry.industry);

    for (let t = 0; t < dates.length; t++) {
      const i = at[t];
      if (i < 0) continue;
      const f = [
        ...features[i],
        ...(funda ? funda[t] : []),
        ...(macroRows ? macroRows[t] : []),
      ];
      /*
        The completeness gate counts TECHNICAL columns only.

        Requiring most features present drops the first year of every name's
        life, which is where the long-window technicals are undefined — that is
        the intent. Counting fundamentals in the same test would be a different
        and wrong rule: a company that simply does not report inventory or R&D
        is not a company with bad price data, and gating on the combined row
        would silently delete every name with sparse filings. Missing
        fundamentals are a fact about the company, and the trees handle them.
      */
      let known = 0;
      for (let k = 0; k < TECHNICAL_COLUMNS.length; k++) {
        if (Number.isFinite(f[k])) known++;
      }
      if (known < TECHNICAL_COLUMNS.length * 0.7) continue;
      rows.push({ t, s, features: f, label: labels[t] });
    }
  }

  return {
    dates,
    symbols,
    industries,
    columns: [
      ...TECHNICAL_COLUMNS,
      ...(options.fundamentals ? FUNDAMENTAL_COLUMNS : []),
      ...(options.macro ? MACRO_COLUMNS : []),
    ],
    rows,
    benchmarkClose,
    rankableColumns:
      TECHNICAL_COLUMNS.length + (options.fundamentals ? FUNDAMENTAL_COLUMNS.length : 0),
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

  const columnCount = panel.rankableColumns;

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
        // Blank the ranked columns only. The macro tail is still valid — it was
        // never a cross-sectional measurement and does not depend on the group.
        for (const row of group) {
          for (let c = 0; c < columnCount; c++) row.features[c] = NaN;
        }
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
