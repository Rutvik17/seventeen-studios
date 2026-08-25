/**
 * The backtest: what the model would actually have done, against SPY.
 *
 *   npm run backtest
 *
 * Trains walk-forward, rebalances weekly, marks to market daily, charges
 * commission and borrow, and records every trade. The benchmark is SPY at 100%
 * — the real, cap-weighted index, however concentrated it happens to be, because
 * that is what the money could otherwise have bought.
 *
 * ---
 * WHY THE MODEL IS RETRAINED INSIDE THE LOOP
 *
 * A single model fitted once and run across sixteen years would be using, on day
 * one, relationships learned from data that had not happened. Retraining at the
 * start of each year on everything available up to HORIZON days before means the
 * model trading January 2018 knows only what a person would have known in
 * December 2017.
 *
 * That is also the honest form of "learning from its mistakes". The model is
 * refitted on what happened to EVERY stock, which necessarily includes the ones
 * it got wrong — without ever being shown how its own positions turned out.
 * Feeding a model its own trade outcomes is reflexive and reliably discovers
 * the exact path the market took.
 *
 * ---
 * WHY WEEKLY
 *
 * Daily rebalancing pays commission five times as often to chase a signal built
 * on quarterly filings and 21-day horizons. Monthly cannot react to an earnings
 * surprise for up to four weeks. Weekly is where the signal's half-life and the
 * cost of acting on it meet.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildPanel, rankNormalise, HORIZON } from '../src/lib/engine/panel.ts';
import { train, predict } from '../src/lib/engine/gbdt.ts';
import { buildTargets, diffBook, frictionCost, BOOK } from '../src/lib/engine/book.ts';
import { exposureFor, REGIME } from '../src/lib/engine/regime.ts';
import { MACRO_COLUMNS } from '../src/lib/engine/macro.ts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = path.join(root, 'data');
const read = (f) => JSON.parse(readFileSync(path.join(dataDir, f), 'utf8'));

/** Trading days between rebalances. */
const REBALANCE = 5;
/** Year from which the strategy is live. Earlier years are training only. */
const FIRST_YEAR = 2013;

console.log('\nloading…');
const prices = read('prices.json');
const fundamentals = existsSync(path.join(dataDir, 'fundamentals.json')) ? read('fundamentals.json').facts : undefined;
const macro = existsSync(path.join(dataDir, 'macro.json')) ? read('macro.json') : undefined;

console.log('building panel…');
const panel = buildPanel(prices, { fundamentals, macro });
rankNormalise(panel);
console.log(`  ${panel.rows.length.toLocaleString()} rows, ${panel.columns.length} features`);

const { dates, symbols, benchmarkClose } = panel;

/* Row lookup by date, so a rebalance can find its cross-section in O(1). */
const rowsByDate = new Map();
for (const row of panel.rows) {
  let g = rowsByDate.get(row.t);
  if (!g) rowsByDate.set(row.t, (g = []));
  g.push(row);
}

/* Close price per symbol per date index, for marking the book. */
const closeOf = symbols.map(() => new Float64Array(dates.length).fill(NaN));
const dateIndex = new Map(dates.map((d, i) => [d, i]));
symbols.forEach((sym, s) => {
  for (const bar of prices.bars[sym] ?? []) {
    const t = dateIndex.get(bar.d);
    if (t !== undefined) closeOf[s][t] = bar.c;
  }
});

/* Trailing volatility per name, read straight from the technical column. */
const volColumn = panel.columns.indexOf('vol_63');
/* Macro columns the regime engine needs, located by name not position. */
const macroBase = panel.rankableColumns;
const volIdx = macro ? macroBase + MACRO_COLUMNS.indexOf('spy_vol_21') : -1;
const trendIdx = macro ? macroBase + MACRO_COLUMNS.indexOf('spy_vs_200d') : -1;

const labelled = panel.rows.filter((r) => Number.isFinite(r.label));
const yearOf = (t) => Number(dates[t].slice(0, 4));

/** One model per year, trained only on what preceded it. */
const modelForYear = new Map();
function modelFor(year) {
  if (modelForYear.has(year)) return modelForYear.get(year);
  const firstT = dates.findIndex((d) => Number(d.slice(0, 4)) === year);
  const trainRows = labelled.filter((r) => r.t < firstT - HORIZON);
  if (trainRows.length < 20_000) { modelForYear.set(year, null); return null; }
  const cut = Math.floor(trainRows.length * 0.85);
  const model = train(
    trainRows.slice(0, cut).map((r) => r.features),
    trainRows.slice(0, cut).map((r) => r.label),
    panel.columns,
    trainRows.slice(cut).map((r) => r.features),
    trainRows.slice(cut).map((r) => r.label),
  );
  console.log(`  trained ${year}: ${trainRows.length.toLocaleString()} rows, ${model.rounds} trees`);
  modelForYear.set(year, model);
  return model;
}

const startT = dates.findIndex((d) => Number(d.slice(0, 4)) === FIRST_YEAR);

let equity = 1;
let peak = 1;
let held = new Map();          // symbol -> weight
const curve = [];
const spyCurve = [];
const trades = [];
const journal = [];
let lastRebalance = -Infinity;

console.log('\ntrading…');
for (let t = startT; t < dates.length; t++) {
  /*
    MARK TO MARKET FIRST, THEN DECIDE.

    Yesterday's positions earn today's return before any rebalance happens.
    Doing it the other way round would apply today's move to a book chosen with
    knowledge of that move, which is the quiet form of look-ahead that produces
    a beautiful curve.
  */
  if (t > startT && held.size) {
    let dayReturn = 0;
    for (const [sym, w] of held) {
      const s = symbols.indexOf(sym);
      const a = closeOf[s][t - 1];
      const b = closeOf[s][t];
      if (a > 0 && b > 0) dayReturn += w * (b / a - 1);
    }
    const shortWeight = [...held.values()].filter((w) => w < 0).reduce((s, w) => s + w, 0);
    equity *= 1 + dayReturn - frictionCost([], shortWeight, BOOK);
  }
  peak = Math.max(peak, equity);
  curve.push(+equity.toFixed(6));
  spyCurve.push(+(benchmarkClose[t] / benchmarkClose[startT]).toFixed(6));

  if (t - lastRebalance < REBALANCE) continue;

  const rows = rowsByDate.get(t);
  if (!rows || rows.length < 50) continue;

  const model = modelFor(yearOf(t));
  if (!model) continue;

  const scores = predict(model, rows.map((r) => r.features));

  const sample = rows[0].features;
  const marketVol = volIdx >= 0 ? sample[volIdx] : NaN;
  const belowTrend = trendIdx >= 0 ? sample[trendIdx] < 0 : false;
  const state = exposureFor(marketVol, belowTrend, (peak - equity) / peak, REGIME);

  const candidates = rows.map((r, i) => ({
    symbol: symbols[r.s],
    score: scores[i],
    volatility: volColumn >= 0 ? r.features[volColumn] : NaN,
  }));

  const targets = buildTargets(candidates, state.exposure, BOOK);
  const priceOf = (sym) => closeOf[symbols.indexOf(sym)][t];
  const day = diffBook(held, targets, dates[t], priceOf);

  equity *= 1 - frictionCost(day, 0, BOOK);
  trades.push(...day);
  held = new Map(targets.map((x) => [x.symbol, x.weight]));
  lastRebalance = t;

  journal.push({
    date: dates[t],
    exposure: +state.exposure.toFixed(3),
    reason: state.reason,
    longs: targets.filter((x) => x.weight > 0).length,
    shorts: targets.filter((x) => x.weight < 0).length,
    gross: +targets.reduce((s, x) => s + Math.abs(x.weight), 0).toFixed(3),
    net: +targets.reduce((s, x) => s + x.weight, 0).toFixed(3),
    equity: +equity.toFixed(4),
  });
}

/* Metrics, computed the same way for both series so they are comparable. */
function stats(series) {
  const r = series.slice(1).map((v, i) => v / series[i] - 1);
  const n = r.length;
  const m = r.reduce((a, b) => a + b, 0) / n;
  const sd = Math.sqrt(r.reduce((s, v) => s + (v - m) ** 2, 0) / (n - 1));
  let pk = -Infinity; let dd = 0;
  for (const v of series) { pk = Math.max(pk, v); dd = Math.max(dd, (pk - v) / pk); }
  const years = n / 252;
  return {
    total: series.at(-1) - 1,
    annual: series.at(-1) ** (1 / years) - 1,
    vol: sd * Math.sqrt(252),
    sharpe: sd > 0 ? (m / sd) * Math.sqrt(252) : 0,
    maxDrawdown: dd,
  };
}

const me = stats(curve);
const spy = stats(spyCurve);
const pct = (v) => `${(v * 100).toFixed(2)}%`;

console.log(`\n${dates[startT]} .. ${dates.at(-1)}   ${journal.length} rebalances, ${trades.length} trades\n`);
console.log('                      strategy        SPY');
console.log('-'.repeat(46));
for (const [label, k, f] of [
  ['total return', 'total', pct], ['annualised', 'annual', pct],
  ['volatility', 'vol', pct], ['Sharpe', 'sharpe', (v) => v.toFixed(2)],
  ['max drawdown', 'maxDrawdown', pct],
]) {
  console.log(`${label.padEnd(20)} ${String(f(me[k])).padStart(10)} ${String(f(spy[k])).padStart(10)}`);
}
console.log(`${'beat SPY by'.padEnd(20)} ${pct(me.annual - spy.annual).padStart(10)}  a year`);

/* Calendar-year returns — where "no losing years" is actually checked. */
console.log('\nby year        strategy       SPY');
console.log('-'.repeat(38));
const byYear = new Map();
dates.slice(startT).forEach((d, i) => {
  const y = Number(d.slice(0, 4));
  if (!byYear.has(y)) byYear.set(y, { i0: i, i1: i });
  byYear.get(y).i1 = i;
});
let losing = 0;
for (const [y, { i0, i1 }] of byYear) {
  const a = curve[i1] / curve[i0] - 1;
  const b = spyCurve[i1] / spyCurve[i0] - 1;
  if (a < 0) losing++;
  console.log(`${y}      ${pct(a).padStart(11)} ${pct(b).padStart(10)}  ${a > b ? '+' : ''}`);
}
console.log(`\n${losing} losing year${losing === 1 ? '' : 's'} of ${byYear.size}`);

mkdirSync(dataDir, { recursive: true });
writeFileSync(path.join(dataDir, 'backtest.json'), JSON.stringify({
  generatedAt: new Date().toISOString(),
  start: dates[startT], end: dates.at(-1),
  dates: dates.slice(startT), curve, spyCurve,
  metrics: { strategy: me, spy },
  journal,
  trades: trades.slice(-500),
  holdings: [...held.entries()].map(([symbol, weight]) => ({ symbol, weight })).sort((a, b) => b.weight - a.weight),
}));
console.log('\nwrote data/backtest.json');
