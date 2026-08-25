/**
 * Pick the tree count and learning rate by measuring, not by convention.
 *
 *   node --experimental-strip-types --import ./scripts/alias-register.mjs scripts/_tune.mjs
 *
 * The cap of 400 was provably binding — five folds stopped at 399, 400, 400,
 * 399 and 381, meaning validation loss was still falling when the loop ran out.
 * The obvious response is "more trees, lower rate", but by how much is a
 * measurement, and a full re-run costs four hours to answer it.
 *
 * So: one fold, several configurations, compare on the SAME held-out validation
 * split. Override the fold with FOLD=2019 etc.
 *
 * The first attempt used 2018 and was a wasted half hour: it stops at 335 of 400
 * on its own, so it never tested the ceiling that prompted the experiment. Pick
 * a fold where the cap actually binds.
 *
 * Validation loss is the only fair comparison here. Training loss always
 * improves with more trees, so comparing on it would recommend the largest
 * configuration every time, which is how a model ends up memorising.
 */

import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildPanel, rankNormalise, HORIZON } from '../src/lib/engine/panel.ts';
import { train, predict } from '../src/lib/engine/gbdt.ts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = path.join(root, 'data');
const read = (f) => JSON.parse(readFileSync(path.join(dataDir, f), 'utf8'));

const prices = read('prices.json');
const fundamentals = existsSync(path.join(dataDir, 'fundamentals.json')) ? read('fundamentals.json').facts : undefined;
const macro = existsSync(path.join(dataDir, 'macro.json')) ? read('macro.json') : undefined;

console.log('building panel…');
const panel = buildPanel(prices, { fundamentals, macro });
rankNormalise(panel);

const labelled = panel.rows.filter((r) => Number.isFinite(r.label));
/*
  The fold must be one where the cap ACTUALLY BINDS, or the experiment does not
  test what prompted it. 2018 stopped at 335 of 400 on its own; the folds that
  hit the ceiling were 2019 (399), 2022 (400) and 2024 (400). 2022 is also the
  hardest year in the sample — the bear market, and the one year macro made
  worse — so a configuration that helps there is worth more than one that helps
  in a calm year.
*/
const YEAR = Number(process.env.FOLD ?? 2022);
const firstT = panel.dates.findIndex((d) => Number(d.slice(0, 4)) === YEAR);
const trainRows = labelled.filter((r) => r.t < firstT - HORIZON);
const testRows = labelled.filter((r) => Number(panel.dates[r.t].slice(0, 4)) === YEAR);

const cut = Math.floor(trainRows.length * 0.85);
const fitX = trainRows.slice(0, cut).map((r) => r.features);
const fitY = trainRows.slice(0, cut).map((r) => r.label);
const valX = trainRows.slice(cut).map((r) => r.features);
const valY = trainRows.slice(cut).map((r) => r.label);

console.log(`fold ${YEAR}: ${fitX.length.toLocaleString()} fit, ${valX.length.toLocaleString()} val, ${testRows.length.toLocaleString()} test\n`);

/** Spearman IC on the held-out year, averaged within days. */
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
    const rank = (k) => {
      const o = g.map((v, i) => ({ i, v: v[k] })).sort((a, b) => a.v - b.v);
      const out = new Array(g.length);
      let i = 0;
      while (i < o.length) {
        let j = i;
        while (j + 1 < o.length && o[j + 1].v === o[i].v) j++;
        const avg = (i + j) / 2;
        for (let q = i; q <= j; q++) out[o[q].i] = avg;
        i = j + 1;
      }
      return out;
    };
    const a = rank('p'); const b = rank('y');
    const n = g.length; const m = (n - 1) / 2;
    let cov = 0; let va = 0; let vb = 0;
    for (let i = 0; i < n; i++) { cov += (a[i] - m) * (b[i] - m); va += (a[i] - m) ** 2; vb += (b[i] - m) ** 2; }
    if (va > 0 && vb > 0) ics.push(cov / Math.sqrt(va * vb));
  }
  return ics.reduce((s, v) => s + v, 0) / (ics.length || 1);
}

const mse = (pred, y) => pred.reduce((s, p, i) => s + (p - y[i]) ** 2, 0) / y.length;

const cases = [
  { label: 'current: 400 @ 0.030', trees: 400, learningRate: 0.03, earlyStopping: 30 },
  { label: '1000 @ 0.030', trees: 1000, learningRate: 0.03, earlyStopping: 50 },
  { label: '1000 @ 0.012', trees: 1000, learningRate: 0.012, earlyStopping: 50 },
  { label: '2000 @ 0.008', trees: 2000, learningRate: 0.008, earlyStopping: 60 },
  { label: '1000 @ 0.012, depth 8', trees: 1000, learningRate: 0.012, earlyStopping: 50, maxDepth: 8 },
  { label: '1000 @ 0.012, lambda 20', trees: 1000, learningRate: 0.012, earlyStopping: 50, lambda: 20 },
  // Shallower trees are the other way to spend a lower learning rate: less
  // capacity per tree, more of them, which is often steadier on noisy targets.
  { label: '2000 @ 0.008, depth 4', trees: 2000, learningRate: 0.008, earlyStopping: 60, maxDepth: 4 },
];

console.log('configuration              rounds   capped   val MSE          test IC    seconds');
console.log('-'.repeat(82));

for (const c of cases) {
  const t0 = Date.now();
  const model = train(fitX, fitY, panel.columns, valX, valY, c);
  const valMSE = mse(predict(model, valX), valY);
  const ic = dailyIC(testRows, predict(model, testRows.map((r) => r.features)));
  const secs = (Date.now() - t0) / 1000;
  const capped = model.rounds >= c.trees ? '  YES  ' : '   no  ';
  console.log(
    `${c.label.padEnd(26)} ${String(model.rounds).padStart(6)}  ${capped}` +
    ` ${valMSE.toExponential(4)}   ${(ic >= 0 ? '+' : '') + ic.toFixed(4)}   ${secs.toFixed(0).padStart(7)}`,
  );
}

console.log('\nval MSE decides; test IC is the honest check that it transferred.');
console.log('A config that improves val MSE and not test IC is fitting the validation split.');
