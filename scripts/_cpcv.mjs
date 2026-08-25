/**
 * How stable is the model's skill, and does it depend on the regime?
 *
 *   node --experimental-strip-types --import ./scripts/alias-register.mjs scripts/_cpcv.mjs
 *
 * Fifteen train/test arrangements instead of one. Two questions, both of which
 * a single chronological split is structurally incapable of answering.
 *
 * 1. WHAT IS THE DISTRIBUTION OF SKILL? Walk-forward gives one number per year
 *    and those numbers are a property of where the calendar happened to cut. If
 *    IC averages +0.02 but ranges from -0.02 to +0.06 depending on the
 *    arrangement, the average is the least interesting thing about it.
 *
 * 2. DOES SKILL TRACK THE REGIME? Each combination holds out a different mix of
 *    market conditions. Regressing each split's IC on its test set's average
 *    volatility asks the question three separate findings have now pointed at:
 *    macro helped in 2018, 2020 and 2021 and hurt in 2022; fundamentals helped
 *    only in volatile years; and model selection failed precisely on a regime
 *    break.
 *
 *    If IC varies systematically with regime, regime-conditional weighting is
 *    justified by measurement rather than by intuition. If it does not, the
 *    three findings were coincidence and we should stop building toward them.
 */

import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildPanel, rankNormalise, HORIZON } from '../src/lib/engine/panel.ts';
import { train, predict } from '../src/lib/engine/gbdt.ts';
import { purgedSplits, splitSummary } from '../src/lib/engine/cpcv.ts';
import { MACRO_COLUMNS } from '../src/lib/engine/macro.ts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = path.join(root, 'data');
const read = (f) => JSON.parse(readFileSync(path.join(dataDir, f), 'utf8'));

const prices = read('prices.json');
const fundamentals = existsSync(path.join(dataDir, 'fundamentals.json')) ? read('fundamentals.json').facts : undefined;
const macro = existsSync(path.join(dataDir, 'macro.json')) ? read('macro.json') : undefined;

console.log('building panel…');
const panel = buildPanel(prices, { fundamentals, macro });
rankNormalise(panel);

const rows = panel.rows.filter((r) => Number.isFinite(r.label));
console.log(`  ${rows.length.toLocaleString()} labelled rows`);

const splits = purgedSplits(rows.map((r) => r.t), { groups: 6, testGroups: 2, horizon: HORIZON, embargo: HORIZON });
const summary = splitSummary(splits, rows.length);
console.log(`  ${summary.splits} splits, mean train share ${(summary.meanTrainShare * 100).toFixed(1)}%, ${(summary.purged * 100).toFixed(1)}% purged\n`);

/* Where to read the regime from, by name rather than by position. */
const volIdx = macro ? panel.rankableColumns + MACRO_COLUMNS.indexOf('spy_vol_21') : -1;
const trendIdx = macro ? panel.rankableColumns + MACRO_COLUMNS.indexOf('spy_vs_200d') : -1;

function dailyIC(subset, preds) {
  const byDate = new Map();
  subset.forEach((r, i) => {
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
  return ics;
}

const mean = (xs) => xs.reduce((a, b) => a + b, 0) / (xs.length || 1);

console.log('split  test groups   train rows    test rows    IC        test vol   below 200d');
console.log('-'.repeat(84));

const results = [];
for (let k = 0; k < splits.length; k++) {
  const s = splits[k];
  const fit = s.train.map((i) => rows[i]);
  const tst = s.test.map((i) => rows[i]);

  /*
    A slice of training is held back for early stopping, taken from the MIDDLE
    rather than the end. Taking it from the end reproduces the exact failure
    this whole exercise exists to fix — validating on the most recent regime.
  */
  const mid = Math.floor(fit.length / 2);
  const valSize = Math.floor(fit.length * 0.12);
  const val = fit.slice(mid, mid + valSize);
  const core = [...fit.slice(0, mid), ...fit.slice(mid + valSize)];

  const model = train(
    core.map((r) => r.features), core.map((r) => r.label),
    panel.columns,
    val.map((r) => r.features), val.map((r) => r.label),
  );

  const ics = dailyIC(tst, predict(model, tst.map((r) => r.features)));
  const ic = mean(ics);

  // Characterise the test period so IC can be regressed on it.
  const vols = volIdx >= 0 ? tst.map((r) => r.features[volIdx]).filter(Number.isFinite) : [];
  const trends = trendIdx >= 0 ? tst.map((r) => r.features[trendIdx]).filter(Number.isFinite) : [];
  const testVol = mean(vols);
  const belowTrend = trends.length ? trends.filter((v) => v < 0).length / trends.length : NaN;

  results.push({ ic, testVol, belowTrend, groups: s.groups });
  console.log(
    `${String(k + 1).padStart(4)}   ${s.groups.join(',').padEnd(12)} ${String(core.length).padStart(10)}` +
    ` ${String(tst.length).padStart(12)}   ${(ic >= 0 ? '+' : '') + ic.toFixed(4)}` +
    `    ${(testVol * 100).toFixed(1).padStart(7)}%   ${(belowTrend * 100).toFixed(0).padStart(8)}%`,
  );
}

const ics = results.map((r) => r.ic);
const m = mean(ics);
const sd = Math.sqrt(mean(ics.map((v) => (v - m) ** 2)));
console.log('-'.repeat(84));
console.log(`mean IC ${(m >= 0 ? '+' : '') + m.toFixed(4)}   sd ${sd.toFixed(4)}   min ${Math.min(...ics).toFixed(4)}   max ${Math.max(...ics).toFixed(4)}   positive ${ics.filter((v) => v > 0).length}/${ics.length}`);

/* Does skill track the regime? Pearson on IC against each regime measure. */
const corr = (a, b) => {
  const ma = mean(a); const mb = mean(b);
  let num = 0; let da = 0; let db = 0;
  for (let i = 0; i < a.length; i++) { num += (a[i] - ma) * (b[i] - mb); da += (a[i] - ma) ** 2; db += (b[i] - mb) ** 2; }
  return da > 0 && db > 0 ? num / Math.sqrt(da * db) : NaN;
};

console.log(`\ncorrelation of IC with the test period's regime`);
console.log(`  vs market volatility      ${corr(ics, results.map((r) => r.testVol)).toFixed(3)}`);
console.log(`  vs share below 200d MA    ${corr(ics, results.map((r) => r.belowTrend)).toFixed(3)}`);
console.log(`\npositive means the model does BETTER in that condition.`);
console.log(`A strong relationship justifies regime-conditional weighting by measurement.`);
console.log(`A flat one means the three earlier findings were coincidence.`);
