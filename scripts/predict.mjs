/**
 * Train once, score everything, and write a tape the book can replay.
 *
 *   npm run predict
 *
 * Produces `data/tape.json` — every prediction the model would have made, for
 * every name, on every trading day, plus the prices and market state needed to
 * trade on them.
 *
 * ---
 * WHY THIS IS SPLIT OUT
 *
 * A full backtest took ninety minutes and roughly eighty-nine of them were
 * training fourteen models. The construction parameters — the no-trade band, the
 * exposure floor, how shorts are gated — do not touch the models at all. They
 * only change what happens AFTER a prediction exists.
 *
 * So tuning any of them by re-running the backtest meant retraining fourteen
 * models to answer a question that had nothing to do with them. With the tape
 * written once, the same sweep runs in seconds, which is the difference between
 * guessing a threshold and measuring twenty of them.
 *
 * The models are still trained walk-forward, one per year, on data ending
 * HORIZON days before the year opens. Caching changes when the work happens, not
 * what the model was allowed to know.
 *
 * ---
 * WHY SCORES FOR EVERY DAY AND NOT JUST REBALANCE DAYS
 *
 * The current book rebalances weekly, so six of every seven scores go unused
 * today. They are written anyway because the open question — monitor daily and
 * trade only on a threshold — cannot be tested without them, and regenerating
 * the tape to answer it costs another ninety minutes.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildPanel, rankNormalise, HORIZON } from '../src/lib/engine/panel.ts';
import { train, predict, importances } from '../src/lib/engine/gbdt.ts';
import { MACRO_COLUMNS } from '../src/lib/engine/macro.ts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = path.join(root, 'data');
const read = (f) => JSON.parse(readFileSync(path.join(dataDir, f), 'utf8'));

/** First year the tape covers. Earlier years exist only to train on. */
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
const startT = dates.findIndex((d) => Number(d.slice(0, 4)) === FIRST_YEAR);
const labelled = panel.rows.filter((r) => Number.isFinite(r.label));
const yearOf = (t) => Number(dates[t].slice(0, 4));

/* Where the book reads market state from, located by name not by position. */
const macroBase = panel.rankableColumns;
const volIdx = macro ? macroBase + MACRO_COLUMNS.indexOf('spy_vol_21') : -1;
const trendIdx = macro ? macroBase + MACRO_COLUMNS.indexOf('spy_vs_200d') : -1;
const nameVolIdx = panel.columns.indexOf('vol_63');

/* Rows grouped by date, so each day is scored in one batch. */
const rowsByDate = new Map();
for (const row of panel.rows) {
  if (row.t < startT) continue;
  let g = rowsByDate.get(row.t);
  if (!g) rowsByDate.set(row.t, (g = []));
  g.push(row);
}

/* Close per symbol per date, carried on the tape so the book needs no panel. */
const dateIndex = new Map(dates.map((d, i) => [d, i]));
const closeOf = symbols.map(() => new Float64Array(dates.length).fill(NaN));
symbols.forEach((sym, s) => {
  for (const bar of prices.bars[sym] ?? []) {
    const t = dateIndex.get(bar.d);
    if (t !== undefined) closeOf[s][t] = bar.c;
  }
});

console.log('\ntraining one model per year, walk-forward…');
const models = new Map();
for (let y = FIRST_YEAR; y <= yearOf(dates.length - 1); y++) {
  const firstT = dates.findIndex((d) => Number(d.slice(0, 4)) === y);
  if (firstT < 0) continue;
  /*
    The embargo. Training stops HORIZON days before the year opens, because a
    row dated the day before is labelled with a return running three weeks INTO
    the year we are about to predict.
  */
  const trainRows = labelled.filter((r) => r.t < firstT - HORIZON);
  if (trainRows.length < 20_000) continue;
  const cut = Math.floor(trainRows.length * 0.85);
  const model = train(
    trainRows.slice(0, cut).map((r) => r.features),
    trainRows.slice(0, cut).map((r) => r.label),
    panel.columns,
    trainRows.slice(cut).map((r) => r.features),
    trainRows.slice(cut).map((r) => r.label),
  );
  models.set(y, model);
  const capped = model.rounds >= 400 ? '  <-- HIT THE TREE CAP' : '';
  console.log(`  ${y}: ${trainRows.length.toLocaleString()} rows, ${model.rounds} trees${capped}`);
}

console.log('\nscoring every day…');
/*
  Parallel arrays rather than objects. `{"AAPL":0.0123,...}` repeats every ticker
  on every one of 3,400 days, which is most of the payload spent restating what
  position already says.
*/
const tapeDates = [];
const tapeScores = [];
const tapeVol = [];
const tapeClose = [];
const tapeMarket = [];
let scored = 0;

for (let t = startT; t < dates.length; t++) {
  const rows = rowsByDate.get(t);
  const model = models.get(yearOf(t));
  if (!rows || !model) continue;

  const scores = predict(model, rows.map((r) => r.features));

  // Aligned to `symbols`, null where the name did not trade or score that day.
  const s = new Array(symbols.length).fill(null);
  const v = new Array(symbols.length).fill(null);
  const c = new Array(symbols.length).fill(null);
  rows.forEach((row, i) => {
    s[row.s] = +scores[i].toFixed(6);
    const vol = nameVolIdx >= 0 ? row.features[nameVolIdx] : NaN;
    v[row.s] = Number.isFinite(vol) ? +vol.toFixed(4) : null;
    const close = closeOf[row.s][t];
    c[row.s] = close > 0 ? +close.toFixed(4) : null;
  });

  const sample = rows[0].features;
  tapeDates.push(dates[t]);
  tapeScores.push(s);
  tapeVol.push(v);
  tapeClose.push(c);
  tapeMarket.push({
    close: +benchmarkClose[t].toFixed(4),
    vol: volIdx >= 0 && Number.isFinite(sample[volIdx]) ? +sample[volIdx].toFixed(4) : null,
    trend: trendIdx >= 0 && Number.isFinite(sample[trendIdx]) ? +sample[trendIdx].toFixed(4) : null,
  });
  scored += rows.length;

  if (tapeDates.length % 500 === 0) console.log(`  …${tapeDates.length} days`);
}

const outFile = path.join(dataDir, 'tape.json');
mkdirSync(dataDir, { recursive: true });
writeFileSync(outFile, JSON.stringify({
  generatedAt: new Date().toISOString(),
  columns: panel.columns.length,
  features: panel.columns,
  symbols,
  industries: panel.industries,
  dates: tapeDates,
  scores: tapeScores,
  volatility: tapeVol,
  close: tapeClose,
  market: tapeMarket,
  importance: importances(models.get(yearOf(dates.length - 1))).slice(0, 25),
}));

console.log(`\n  ${tapeDates.length} days, ${scored.toLocaleString()} scores`);
console.log(`  wrote data/tape.json (${(statSync(outFile).size / 1024 / 1024).toFixed(1)} MB, gitignored)`);
console.log('\n  the book can now be tuned without retraining anything');
