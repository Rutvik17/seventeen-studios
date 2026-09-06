/**
 * Walk-forward training, and the only question worth answering first:
 * does the model predict anything out of sample, and does SEC data help?
 *
 *   npm run train
 *
 * No portfolio, no trades, no equity curve. Those come later and every one of
 * them can look wonderful on a model with no predictive power, because position
 * sizing and risk control produce curves of their own. If the information
 * coefficient is flat there is nothing to build on.
 *
 * ---
 * THE EMBARGO, WHICH IS NOT OPTIONAL
 *
 * Each row is labelled with the return over the NEXT 21 trading days. A row
 * dated one day before the test period opens is labelled with a return running
 * 20 days INTO that test period. Training on it leaks the answer.
 *
 * So training stops HORIZON days before each fold. That gap is dead data,
 * deliberately discarded, and skipping it is the most common reason an equity
 * model reports a strong IC and then trades like noise.
 *
 * ---
 * WHY BOTH FEATURE SETS RUN HERE RATHER THAN IN TWO SESSIONS
 *
 * The comparison is only meaningful on IDENTICAL folds — same dates, same
 * embargo, same seed, same early-stopping rule, one variable changed. Running
 * them separately and comparing remembered numbers is how a data family gets
 * credited for a fold boundary that happened to move.
 *
 * ---
 * WHAT AN IC OF 0.03 MEANS
 *
 * The rank correlation between prediction and outcome, measured across names
 * within each day. It is not R-squared and the numbers look small: published
 * equity models live between 0.02 and 0.06, and a consistent 0.03 spread across
 * hundreds of names, rebalanced repeatedly, is a real edge. Single-name accuracy
 * is the wrong intuition entirely.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildPanel, rankNormalise, HORIZON } from '../src/lib/engine/panel.ts';
import { train, predict, importances } from '../src/lib/engine/gbdt.ts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = path.join(root, 'data');

console.log('\nloading prices…');
const prices = JSON.parse(readFileSync(path.join(dataDir, 'prices.json'), 'utf8'));

const fundamentalsPath = path.join(dataDir, 'fundamentals.json');
const fundamentals = existsSync(fundamentalsPath)
  ? JSON.parse(readFileSync(fundamentalsPath, 'utf8')).facts
  : null;
console.log(fundamentals
  ? `  fundamentals available for ${Object.keys(fundamentals).length} companies`
  : '  no fundamentals on disk — price-only run');

const macroPath = path.join(dataDir, 'macro.json');
const macro = existsSync(macroPath) ? JSON.parse(readFileSync(macroPath, 'utf8')) : null;
console.log(macro
  ? `  macro: ${Object.keys(macro.series).length} series, ${macro.fomc.length} FOMC meetings`
  : '  no macro on disk');

/*
  The three SEC families, each optional for the same reason the others are: the
  only way to know whether one carries information is to build the panel twice
  and change nothing else. Fundamentals cost 0.0042 of IC when that was done to
  them, and that result would have been invisible had they been mandatory.

  A missing file is not an error. A machine that has not run `npm run 13f` yet
  should still be able to train the price model.
*/
function optional(file, pick) {
  const at = path.join(dataDir, file);
  if (!existsSync(at)) return null;
  return pick(JSON.parse(readFileSync(at, 'utf8')));
}

const institutional = optional('13f.json', (j) => j.quarters
  .filter((q) => q.period >= '2013-01-01' && q.period <= '2026-12-31'));
const insider = optional('form4.json', (j) => j.events);
const language = optional('earnings.json', (j) => j.releases);
const membership = optional('membership.json', (j) => j.snapshots);

console.log(institutional ? `  13F: ${institutional.length} report periods` : '  no 13F on disk');
console.log(insider ? `  Form 4: ${insider.length.toLocaleString()} filing-days` : '  no Form 4 on disk');
console.log(membership ? `  membership: ${membership.length} index snapshots` : '  no membership on disk');
console.log(language ? `  earnings: ${language.length.toLocaleString()} scored releases` : '  no earnings on disk');

const mean = (xs) => xs.reduce((a, b) => a + b, 0) / (xs.length || 1);

/** Spearman correlation between prediction and outcome, within each day. */
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
    const m = (n - 1) / 2;
    let cov = 0; let va = 0; let vb = 0;
    for (let i = 0; i < n; i++) {
      cov += (a[i] - m) * (b[i] - m);
      va += (a[i] - m) ** 2;
      vb += (b[i] - m) ** 2;
    }
    if (va > 0 && vb > 0) ics.push(cov / Math.sqrt(va * vb));
  }
  return ics;
}

function walkForward(panel, label) {
  const year = (t) => Number(panel.dates[t].slice(0, 4));
  const labelled = panel.rows.filter((r) => Number.isFinite(r.label));
  const years = [...new Set(labelled.map((r) => year(r.t)))].sort().filter((y) => y >= 2013);

  const perYear = [];
  const allIC = [];
  let lastModel = null;

  for (const y of years) {
    const testRows = labelled.filter((r) => year(r.t) === y);
    if (testRows.length < 1000) continue;

    const firstTestT = Math.min(...testRows.map((r) => r.t));
    const trainRows = labelled.filter((r) => r.t < firstTestT - HORIZON);
    if (trainRows.length < 20_000) continue;

    // Validation is the tail of training, still strictly before the fold.
    const cut = Math.floor(trainRows.length * 0.85);
    const model = train(
      trainRows.slice(0, cut).map((r) => r.features),
      trainRows.slice(0, cut).map((r) => r.label),
      panel.columns,
      trainRows.slice(cut).map((r) => r.features),
      trainRows.slice(cut).map((r) => r.label),
    );
    lastModel = model;

    const ics = dailyIC(testRows, predict(model, testRows.map((r) => r.features)));
    allIC.push(...ics);
    perYear.push({ year: y, ic: mean(ics), days: ics.length, rounds: model.rounds });
    process.stdout.write(`  ${label} ${y}\r`);
  }

  const m = mean(allIC);
  const sd = Math.sqrt(mean(allIC.map((v) => (v - m) ** 2)));
  return {
    perYear,
    mean: m,
    t: sd > 0 ? (m / sd) * Math.sqrt(allIC.length) : 0,
    hit: allIC.filter((v) => v > 0).length / (allIC.length || 1),
    days: allIC.length,
    positiveYears: perYear.filter((p) => p.ic > 0).length,
    model: lastModel,
  };
}

/*
  EVERY PANEL IN ONE LIST, SO ONE OF THEM CAN BE RUN ALONE.

  These were three inline blocks and an `additions` array, which was fine while
  the run happened on one machine in one sitting. It takes about four hours,
  and that is too long to hold a laptop hostage — so the run has to be able to
  happen in CI, where the sane shape is one job per panel, in parallel, each
  finishing in about half an hour. `--only=<slug>` is what makes that possible.

  Nothing about the comparison changes. Every panel is still built on TECHNICAL
  ONLY rather than stacked on the one before it, and that is deliberate:
  fundamentals cost 0.0042 of IC and macro was a wash, so stacking a new family
  on top of them would measure the new signal through two known-neutral filters
  and blame any shortfall on the wrong thing. Against the price-only baseline
  the comparison is clean — same rows, same folds, same seed, one family added.

  TECHNICAL MUST STAY FIRST. The comparison table reads `runs[0]` as the
  baseline every other panel is scored against.
*/
const PANELS = [
  { slug: 'technical', name: 'technical only', extra: {} },
  { slug: 'fundamental', name: '+ SEC fundamentals', extra: { fundamentals } },
  { slug: 'macro', name: '+ macro', extra: { fundamentals, macro } },
  { slug: '13f-ownership', name: '+ 13F ownership', extra: { institutional } },
  { slug: 'form-4-insiders', name: '+ Form 4 insiders', extra: { insider } },
  { slug: 'earnings-language', name: '+ earnings language', extra: { language } },
  { slug: 'all-three-sec', name: '+ all three SEC', extra: { institutional, insider, language } },
  /*
    THE OPEN HALF OF THE SURVIVORSHIP QUESTION.

    Selection was gated in the backtest and cost 87% of the excess return.
    This gates TRAINING: a name only contributes rows for days it was actually
    in the index, which drops 18.8% of them. Everything else is identical, so
    the difference is the bias arriving through the training set.
  */
  { slug: 'point-in-time-training', name: 'point-in-time training', extra: { membership } },
  {
    slug: 'point-in-time-all-sec',
    name: 'point-in-time + all SEC',
    extra: { membership, institutional, insider, language },
  },
];

const ONLY = (process.argv.find((a) => a.startsWith('--only=')) ?? '').slice(7);
const wanted = ONLY ? PANELS.filter((p) => p.slug === ONLY) : PANELS;
if (ONLY && !wanted.length) {
  console.error(`train: no panel called "${ONLY}". Panels: ${PANELS.map((p) => p.slug).join(', ')}`);
  process.exit(1);
}

/* One shape for a finished panel, so a partial and a full run agree. */
const summarise = (run) => ({
  slug: run.slug,
  name: run.name,
  /* Stamped per panel: split across nine jobs there is no single "the run". */
  trainedAt: new Date().toISOString(),
  meanIC: +run.result.mean.toFixed(5),
  t: +run.result.t.toFixed(2),
  hitRate: +run.result.hit.toFixed(4),
  days: run.result.days,
  positiveYears: run.result.positiveYears,
  years: run.result.perYear.length,
  perYear: run.result.perYear.map((y) => ({
    year: y.year, ic: +y.ic.toFixed(5), days: y.days, rounds: y.rounds,
  })),
});

const runs = [];
for (const panel of wanted) {
  /*
    A family with no file on disk is skipped rather than fatal, for the same
    reason `optional()` exists: a machine that has not run `npm run 13f` should
    still be able to train the price model.
  */
  if (!Object.values(panel.extra).every(Boolean)) {
    console.log(`\nskipping ${panel.name} — its data is not on disk`);
    continue;
  }

  console.log(`\nbuilding ${panel.name}…`);
  const t0 = Date.now();
  const built = buildPanel(prices, panel.extra);
  rankNormalise(built);
  const rawColumns = built.columns.length - (built.rankableColumns ?? built.columns.length);
  console.log(
    `  ${built.rows.length.toLocaleString()} rows, ${built.columns.length} features`
    + (rawColumns > 0 ? ` (${built.rankableColumns} ranked, ${rawColumns} raw macro)` : '')
    + ` (${((Date.now() - t0) / 1000).toFixed(1)}s)`,
  );
  runs.push({ ...panel, result: walkForward(built, panel.slug) });
}

/*
  A SINGLE PANEL WRITES ITS OWN FILE AND STOPS.

  There is no comparison to print from one run and no model to choose between,
  so it saves what it found — including the fitted model, because the merge
  step has to be able to ship the winner without refitting anything — and
  leaves the table to `npm run train:merge`.
*/
if (ONLY) {
  const [run] = runs;
  if (!run) {
    console.error(`train: ${ONLY} needs data that is not on disk`);
    process.exit(1);
  }
  const partials = path.join(dataDir, 'partials');
  mkdirSync(partials, { recursive: true });
  writeFileSync(
    path.join(partials, `${run.slug}.json`),
    `${JSON.stringify({ ...summarise(run), model: run.result.model ?? null })}\n`,
  );
  const ic = run.result.mean;
  console.log(`\nwrote data/partials/${run.slug}.json — mean IC ${ic >= 0 ? '+' : ''}${ic.toFixed(5)}`);
  process.exit(0);
}

console.log('\n\nyear-by-year IC\n');
const header = ['year', ...runs.map((r) => r.name.padStart(18))].join('  ');
console.log(header);
console.log('-'.repeat(header.length));
for (const { year } of runs[0].result.perYear) {
  const cells = runs.map((r) => {
    const row = r.result.perYear.find((p) => p.year === year);
    const v = row ? row.ic : NaN;
    return ((v >= 0 ? '+' : '') + v.toFixed(4)).padStart(18);
  });
  console.log([String(year), ...cells].join('  '));
}
console.log('-'.repeat(header.length));
console.log(['mean', ...runs.map((r) => ((r.result.mean >= 0 ? '+' : '') + r.result.mean.toFixed(4)).padStart(18))].join('  '));
console.log(['t-stat', ...runs.map((r) => r.result.t.toFixed(1).padStart(18))].join('  '));
console.log(['hit', ...runs.map((r) => `${(r.result.hit * 100).toFixed(1)}%`.padStart(18))].join('  '));
console.log(['yrs +', ...runs.map((r) => `${r.result.positiveYears}/${r.result.perYear.length}`.padStart(18))].join('  '));

/*
  Each data family's contribution is the step it adds, not the total.

  Reported one at a time and cumulatively, because a family that lifts IC by
  nothing has not earned its place in a nightly pipeline however interesting the
  data is — and the honest way to find that out is to add it alone and look.
*/
console.log('\nwhat each data family adds');
for (let i = 1; i < runs.length; i++) {
  const step = runs[i].result.mean - runs[i - 1].result.mean;
  const total = runs[i].result.mean - runs[0].result.mean;
  console.log(
    `  ${runs[i].name.padEnd(20)} ${(step >= 0 ? '+' : '') + step.toFixed(4)} on its own` +
    `   ${(total >= 0 ? '+' : '') + total.toFixed(4)} cumulative` +
    `   (${((total / Math.abs(runs[0].result.mean)) * 100).toFixed(0)}% vs price-only)`,
  );
}

/*
  THE COMPARISON IS SAVED, NOT JUST PRINTED.

  This run costs about six hours. Its actual product is the table above — which
  family helped and by how much — and until now that existed only in whatever
  terminal happened to be open. A result nobody can re-read is a result nobody
  can check, which is the same failure as the -69% survivorship figure whose
  script was never committed.
*/
mkdirSync(dataDir, { recursive: true });
writeFileSync(path.join(dataDir, 'training.json'), `${JSON.stringify({
  trainedAt: new Date().toISOString(),
  horizon: HORIZON,
  runs: runs.map(summarise),
}, null, 2)}\n`);
console.log('\nwrote data/training.json');

/*
  THE SHIPPED MODEL IS THE BEST ONE, MEASURED.

  This used to take `runs.at(-1)` — the last configuration to finish, which is
  an ordering accident rather than a result. If adding a family HURTS, shipping
  it because it ran last is exactly the mistake this whole comparison exists to
  prevent.
*/
const best = [...runs].sort((a, b) => b.result.mean - a.result.mean)[0];
console.log(`\nbest by mean IC: ${best.name} at ${best.result.mean >= 0 ? '+' : ''}${best.result.mean.toFixed(4)}`);

if (best.result.model) {
  console.log(`\nwhat the ${best.name} model used:`);
  for (const { column, share } of importances(best.result.model).slice(0, 16)) {
    console.log(`  ${column.padEnd(22)} ${(share * 100).toFixed(1).padStart(5)}%  ${'#'.repeat(Math.round(share * 110))}`);
  }
  writeFileSync(path.join(dataDir, 'model.json'), JSON.stringify(best.result.model));
  console.log('\nwrote data/model.json');
}
