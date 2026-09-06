#!/usr/bin/env node
/**
 * WHAT EACH COLUMN IS WORTH ON ITS OWN.
 *
 * ---
 * WHY THIS COMES BEFORE ANY SELECTION SCHEME
 *
 * The nine-panel retrain admitted or rejected whole families and every one of
 * them lost: 13F cost 0.0069 of IC, Form 4 cost 0.0082, earnings language cost
 * 0.0037. That is a verdict on 26 fundamentals columns at once, or 8 insider
 * columns at once, and a family can easily contain one column that carries
 * signal and seven that carry noise. Admitting them together buries the first
 * under the rest.
 *
 * Before building a selector it is worth knowing whether there is anything to
 * select. This fits no model: it takes each column as if it were the
 * prediction and scores it with the same daily rank correlation the walk-
 * forward uses. Minutes, not hours, and it answers the question the four-hour
 * run cannot — which COLUMN, rather than which family.
 *
 * ---
 * THIS IS A DIAGNOSTIC, NOT THE SELECTION
 *
 * The numbers here are computed over the whole sample, which is exactly the
 * thing a selector must not do — choosing columns on the same rows you later
 * score on is how noise gets promoted to signal. Nothing downstream should
 * pick columns off this table and call the result out-of-sample.
 *
 * What it is for: deciding whether a nested per-fold selector is worth
 * building at all. If nothing clears the noise floor here, it is not.
 *
 * ---
 * WHY THE MACRO COLUMNS WILL LOOK DEAD, AND WHY THAT IS WRONG
 *
 * `rankableColumns` splits the panel: leading columns are ranked
 * cross-sectionally, the macro tail passes through raw so a tree can split on
 * `vix > 28`. A raw macro column has the SAME value for every name on a given
 * day, so its cross-sectional correlation is undefined and it scores nothing
 * here by construction. Macro conditions the model; it does not rank names.
 * Those rows are reported separately rather than at the bottom of the table.
 *
 * Run: npm run features
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildPanel, rankNormalise, HORIZON } from '../src/lib/engine/panel.ts';
import { TECHNICAL_COLUMNS } from '../src/lib/engine/technical.ts';
import { FUNDAMENTAL_COLUMNS } from '../src/lib/engine/fundamental.ts';
import { INSTITUTIONAL_COLUMNS } from '../src/lib/engine/institutional.ts';
import { INSIDER_COLUMNS } from '../src/lib/engine/insider.ts';
import { LANGUAGE_COLUMNS } from '../src/lib/engine/language.ts';
import { MACRO_COLUMNS } from '../src/lib/engine/macro.ts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = path.join(root, 'data');

const optional = (file, pick) => {
  const at = path.join(dataDir, file);
  return existsSync(at) ? pick(JSON.parse(readFileSync(at, 'utf8'))) : null;
};

console.log('loading…');
const prices = JSON.parse(readFileSync(path.join(dataDir, 'prices.json'), 'utf8'));
const fundamentals = optional('fundamentals.json', (j) => j.facts);
const macro = optional('macro.json', (j) => j);
const institutional = optional('13f.json', (j) => j.quarters
  .filter((q) => q.period >= '2013-01-01' && q.period <= '2026-12-31'));
const insider = optional('form4.json', (j) => j.events);
const language = optional('earnings.json', (j) => j.releases);

/*
  Every family at once, because the point is to see all the columns side by
  side on identical rows. Membership is deliberately NOT applied: gating the
  universe changes which rows exist, and a column's own IC should be measured
  on the same rows as every other column's.
*/
console.log('building the full panel…');
const t0 = Date.now();
const panel = buildPanel(prices, { fundamentals, macro, institutional, insider, language });
rankNormalise(panel);
console.log(
  `  ${panel.rows.length.toLocaleString()} rows, ${panel.columns.length} columns`
  + ` (${panel.rankableColumns} ranked, ${panel.columns.length - panel.rankableColumns} raw macro)`
  + ` (${((Date.now() - t0) / 1000).toFixed(1)}s)`,
);

const labelled = panel.rows.filter((r) => Number.isFinite(r.label));
const year = (t) => Number(panel.dates[t].slice(0, 4));

/**
 * Spearman correlation within each day, between one column and the outcome.
 *
 * The same shape the walk-forward scores a model with — a column is just a
 * prediction nobody fitted.
 */
function dailyIC(rows, values) {
  const byDate = new Map();
  rows.forEach((r, i) => {
    const v = values[i];
    if (!Number.isFinite(v)) return;
    let g = byDate.get(r.t);
    if (!g) byDate.set(r.t, (g = []));
    g.push({ p: v, y: r.label });
  });

  const out = [];
  for (const [t, g] of byDate) {
    if (g.length < 20) continue;
    const rank = (key) => {
      const order = g.map((v, i) => ({ i, v: v[key] })).sort((a, b) => a.v - b.v);
      const ranks = new Array(g.length);
      let i = 0;
      while (i < order.length) {
        let j = i;
        while (j + 1 < order.length && order[j + 1].v === order[i].v) j += 1;
        const avg = (i + j) / 2;
        for (let k = i; k <= j; k += 1) ranks[order[k].i] = avg;
        i = j + 1;
      }
      return ranks;
    };
    const a = rank('p');
    const b = rank('y');
    const n = g.length;
    const m = (n - 1) / 2;
    let cov = 0; let va = 0; let vb = 0;
    for (let i = 0; i < n; i += 1) {
      cov += (a[i] - m) * (b[i] - m);
      va += (a[i] - m) ** 2;
      vb += (b[i] - m) ** 2;
    }
    /*
      Zero variance means the column said the same thing about every name that
      day. For a raw macro column that is true every day and is the reason it
      scores nothing here.
    */
    if (va > 0 && vb > 0) out.push({ t, ic: cov / Math.sqrt(va * vb) });
  }
  return out;
}

const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

/*
  WHICH FAMILY A COLUMN BELONGS TO, FROM THE FAMILY'S OWN LIST.

  The first version matched name prefixes, which was a guess that happened to
  be wrong: the earnings family's columns are dictionary words — "accelerate",
  "adverse", "believe" — and match no prefix at all, so a seventh of the table
  would have been filed under `technical`. Every family exports the list it
  contributes, so membership is a lookup rather than a pattern.
*/
const FAMILY = new Map();
for (const [family, columns] of [
  ['technical', TECHNICAL_COLUMNS],
  ['fundamentals', FUNDAMENTAL_COLUMNS],
  ['13F', INSTITUTIONAL_COLUMNS],
  ['Form 4', INSIDER_COLUMNS],
  ['earnings', LANGUAGE_COLUMNS],
  ['macro', MACRO_COLUMNS],
]) {
  for (const c of columns) if (!FAMILY.has(c)) FAMILY.set(c, family);
}
const familyOf = (name) => FAMILY.get(name) ?? 'unknown';

console.log('\nscoring each column…');
const results = [];
for (let c = 0; c < panel.columns.length; c += 1) {
  const name = panel.columns[c];
  const values = labelled.map((r) => r.features[c]);
  const present = values.reduce((n, v) => n + (Number.isFinite(v) ? 1 : 0), 0);
  const series = dailyIC(labelled, values);
  const ics = series.map((s) => s.ic);

  /*
    A t-statistic over days, the same way the walk-forward reports one: the
    mean IC against its own standard error. It is what separates a column with
    a small consistent edge from one with a large accidental one.
  */
  const m = mean(ics);
  const sd = ics.length > 1
    ? Math.sqrt(ics.reduce((a, x) => a + (x - m) ** 2, 0) / (ics.length - 1))
    : 0;
  const t = sd > 0 ? (m / sd) * Math.sqrt(ics.length) : 0;

  /* Early against late, because a column that only worked before 2020 is not
     a column to select on in 2026. */
  const early = mean(series.filter((s) => year(s.t) <= 2019).map((s) => s.ic));
  const late = mean(series.filter((s) => year(s.t) >= 2023).map((s) => s.ic));

  results.push({
    column: name,
    family: familyOf(name),
    ranked: c < panel.rankableColumns,
    coverage: +(present / labelled.length).toFixed(4),
    days: ics.length,
    meanIC: +m.toFixed(5),
    t: +t.toFixed(2),
    early: +early.toFixed(5),
    late: +late.toFixed(5),
  });

  if ((c + 1) % 10 === 0) process.stdout.write(`  ${c + 1}/${panel.columns.length}\n`);
}

const ranked = results.filter((r) => r.ranked).sort((a, b) => Math.abs(b.meanIC) - Math.abs(a.meanIC));
const raw = results.filter((r) => !r.ranked);

console.log('\ncross-sectional columns, by absolute mean IC\n');
console.log('column                        family          cov    days   mean IC       t     <=2019    >=2023');
console.log('-'.repeat(104));
for (const r of ranked) {
  console.log(
    `${r.column.padEnd(28)}  ${r.family.padEnd(13)} `
    + `${(r.coverage * 100).toFixed(0).padStart(3)}%  `
    + `${String(r.days).padStart(5)}  `
    + `${(r.meanIC >= 0 ? '+' : '') + r.meanIC.toFixed(5)}`.padStart(9)
    + `${r.t.toFixed(2)}`.padStart(8)
    + `${(r.early >= 0 ? '+' : '') + r.early.toFixed(5)}`.padStart(11)
    + `${(r.late >= 0 ? '+' : '') + r.late.toFixed(5)}`.padStart(10),
  );
}

if (raw.length) {
  console.log(`\n${raw.length} raw macro columns carry no cross-sectional IC by construction:`);
  console.log(`  ${raw.map((r) => r.column).join(', ')}`);
}

/*
  A NOISE FLOOR TO READ THE TABLE AGAINST.

  |t| >= 2 is the conventional line and it is far too generous here: with
  thousands of days a column can clear it on an edge too small to trade. The
  count at each level is printed so the shape of the distribution is visible
  rather than a single threshold being asserted.
*/
console.log('\nhow many columns clear each bar');
for (const bar of [2, 3, 5, 10]) {
  const n = ranked.filter((r) => Math.abs(r.t) >= bar).length;
  const fams = [...new Set(ranked.filter((r) => Math.abs(r.t) >= bar).map((r) => r.family))];
  console.log(`  |t| >= ${String(bar).padStart(2)}   ${String(n).padStart(3)} columns   ${fams.join(', ')}`);
}

console.log('\nby family');
const families = [...new Set(results.map((r) => r.family))];
for (const f of families) {
  const rows = ranked.filter((r) => r.family === f);
  if (!rows.length) continue;
  const best = rows[0];
  console.log(
    `  ${f.padEnd(14)} ${String(rows.length).padStart(2)} ranked columns, `
    + `best ${best.column} at ${best.meanIC >= 0 ? '+' : ''}${best.meanIC.toFixed(5)} (t ${best.t.toFixed(1)}), `
    + `${rows.filter((r) => Math.abs(r.t) >= 3).length} with |t| >= 3`,
  );
}

mkdirSync(dataDir, { recursive: true });
writeFileSync(path.join(dataDir, 'feature-ic.json'), `${JSON.stringify({
  measuredAt: new Date().toISOString(),
  horizon: HORIZON,
  rows: labelled.length,
  note:
    'Univariate daily-IC of each panel column over the WHOLE sample. A diagnostic for whether '
    + 'per-column selection is worth building — NOT a selection. Choosing columns off this table '
    + 'and scoring them on the same rows would promote noise to signal. Raw macro columns score '
    + 'nothing by construction: they are constant across names within a day.',
  columns: results,
}, null, 2)}\n`);
console.log('\nwrote data/feature-ic.json');
