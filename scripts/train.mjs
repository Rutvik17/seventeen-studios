/**
 * Walk-forward training, and the only question that matters first:
 * does the model predict anything out of sample?
 *
 *   npm run train
 *
 * No portfolio, no trades, no equity curve. Those come later and they can all
 * look wonderful on a model with no predictive power, because position sizing
 * and risk control produce curves of their own. If the information coefficient
 * is zero there is nothing to build on, and it is better to find that out here
 * than after another week of architecture.
 *
 * ---
 * THE EMBARGO, WHICH IS NOT OPTIONAL
 *
 * Each row is labelled with the return over the NEXT 21 trading days. A row
 * dated one day before the test period begins is labelled with a return that
 * runs 20 days INTO that test period. Training on it leaks the answer.
 *
 * So training stops HORIZON days before the test fold opens. That gap is dead
 * data, deliberately thrown away. Skipping it is the single most common reason
 * an equity model reports a strong IC and then trades like noise.
 *
 * ---
 * WHAT AN IC OF 0.03 MEANS
 *
 * The rank correlation between prediction and outcome, measured across names
 * within each day. It is not R-squared and the numbers look small: published
 * equity models live between 0.02 and 0.06, and a consistent 0.03 is a real,
 * tradeable edge once it is spread across hundreds of names and rebalanced
 * repeatedly. A single-name accuracy intuition is the wrong yardstick.
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildPanel, rankNormalise, HORIZON } from '../src/lib/engine/panel.ts';
import { train, predict, importances } from '../src/lib/engine/gbdt.ts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

console.log('\nloading prices…');
const data = JSON.parse(readFileSync(path.join(root, 'data', 'prices.json'), 'utf8'));

console.log('building panel…');
const t0 = Date.now();
const panel = buildPanel(data);
console.log(`  ${panel.rows.length.toLocaleString()} rows, ${panel.symbols.length} names, ${panel.columns.length} features`);
console.log(`  ${panel.dates[0]} .. ${panel.dates.at(-1)}   (${((Date.now() - t0) / 1000).toFixed(1)}s)`);

console.log('rank-normalising within industry, per day…');
rankNormalise(panel);

/* Only rows whose forward return is known can train or be scored. */
const labelled = panel.rows.filter((r) => Number.isFinite(r.label));
console.log(`  ${labelled.length.toLocaleString()} labelled rows`);

const year = (t) => Number(panel.dates[t].slice(0, 4));
const years = [...new Set(labelled.map((r) => year(r.t)))].sort();
const testYears = years.filter((y) => y >= 2013);

/** Spearman correlation, computed within a single day then averaged. */
function dailyIC(rows, preds) {
  const byDate = new Map();
  rows.forEach((r, i) => {
    let g = byDate.get(r.t);
    if (!g) byDate.set(r.t, (g = []));
    g.push({ p: preds[i], y: r.label });
  });

  const ics = [];
  for (const g of byDate.values()) {
    if (g.length < 20) continue;
    const rank = (key) => {
      const order = g.map((v, i) => ({ i, v: v[key] })).sort((a, b) => a.v - b.v);
      const out = new Array(g.length);
      let i = 0;
      while (i < order.length) {
        let j = i;
        while (j + 1 < order.length && order[j + 1].v === order[i].v) j++;
        const avg = (i + j) / 2;
        for (let k = i; k <= j; k++) out[order[k].i] = avg;
        i = j + 1;
      }
      return out;
    };
    const a = rank('p');
    const b = rank('y');
    const n = g.length;
    const mean = (n - 1) / 2;
    let cov = 0; let va = 0; let vb = 0;
    for (let i = 0; i < n; i++) {
      cov += (a[i] - mean) * (b[i] - mean);
      va += (a[i] - mean) ** 2;
      vb += (b[i] - mean) ** 2;
    }
    if (va > 0 && vb > 0) ics.push(cov / Math.sqrt(va * vb));
  }
  return ics;
}

const mean = (xs) => xs.reduce((a, b) => a + b, 0) / (xs.length || 1);

console.log(`\nwalk-forward: train on everything before each year, predict that year`);
console.log(`embargo of ${HORIZON} trading days between train and test\n`);
console.log('year    train rows   test rows   rounds     IC      IC t-stat   hit rate');
console.log('-'.repeat(76));

const allIC = [];
let lastModel = null;

for (const y of testYears) {
  const testRows = labelled.filter((r) => year(r.t) === y);
  if (testRows.length < 1000) continue;

  const firstTestT = Math.min(...testRows.map((r) => r.t));
  // The embargo: drop training rows whose label window reaches into the fold.
  const trainRows = labelled.filter((r) => r.t < firstTestT - HORIZON);
  if (trainRows.length < 20_000) continue;

  // The last slice of training becomes validation for early stopping. It is
  // still strictly before the test fold, so nothing leaks.
  const cut = Math.floor(trainRows.length * 0.85);
  const fitRows = trainRows.slice(0, cut);
  const valRows = trainRows.slice(cut);

  const model = train(
    fitRows.map((r) => r.features), fitRows.map((r) => r.label),
    panel.columns,
    valRows.map((r) => r.features), valRows.map((r) => r.label),
  );
  lastModel = model;

  const preds = predict(model, testRows.map((r) => r.features));
  const ics = dailyIC(testRows, preds);
  allIC.push(...ics);

  const m = mean(ics);
  const sd = Math.sqrt(mean(ics.map((v) => (v - m) ** 2)));
  const t = sd > 0 ? (m / sd) * Math.sqrt(ics.length) : 0;
  const hit = ics.filter((v) => v > 0).length / (ics.length || 1);

  console.log(
    `${y}   ${String(trainRows.length).padStart(10)}  ${String(testRows.length).padStart(10)}` +
    `   ${String(model.rounds).padStart(6)}  ${(m >= 0 ? '+' : '') + m.toFixed(4)}` +
    `   ${t.toFixed(1).padStart(9)}   ${(hit * 100).toFixed(1)}%`,
  );
}

const m = mean(allIC);
const sd = Math.sqrt(mean(allIC.map((v) => (v - m) ** 2)));
console.log('-'.repeat(76));
console.log(
  `all      ${String(allIC.length).padStart(9)} days` +
  `                    ${(m >= 0 ? '+' : '') + m.toFixed(4)}` +
  `   ${((m / sd) * Math.sqrt(allIC.length)).toFixed(1).padStart(9)}` +
  `   ${((allIC.filter((v) => v > 0).length / allIC.length) * 100).toFixed(1)}%`,
);

if (lastModel) {
  console.log('\nwhat the most recent model actually used:');
  for (const { column, share } of importances(lastModel).slice(0, 12)) {
    console.log(`  ${column.padEnd(16)} ${(share * 100).toFixed(1).padStart(5)}%  ${'#'.repeat(Math.round(share * 120))}`);
  }
  mkdirSync(path.join(root, 'data'), { recursive: true });
  writeFileSync(path.join(root, 'data', 'model.json'), JSON.stringify(lastModel));
  console.log('\nwrote data/model.json');
}
