#!/usr/bin/env node
/**
 * ASSEMBLE ONE TRAINING RESULT OUT OF PANELS THAT RAN SEPARATELY.
 *
 * ---
 * WHY THE RUN IS SPLIT AT ALL
 *
 * The nine-panel comparison takes about four hours end to end, which is too
 * long to run on a laptop somebody is trying to use. The panels do not depend
 * on each other — each is a walk-forward over the same folds with one family
 * added — so they are embarrassingly parallel, and CI can run one job per
 * panel and finish in the time the slowest one takes.
 *
 * `train.mjs --only=<slug>` writes `data/partials/<slug>.json`. This reads all
 * of them, prints the comparison, writes `data/training.json`, and ships the
 * winning model as `data/model.json`.
 *
 * ---
 * WHY THE PARTIALS CARRY THEIR MODEL
 *
 * The point of the comparison is that the shipped model is the BEST one rather
 * than the last one to finish — a mistake this codebase has already made once,
 * when it took `runs.at(-1)` and would have shipped a family that hurt simply
 * because it ran last. Choosing the winner is only meaningful if the winner's
 * fitted model is still available, and refitting it here would be four hours
 * of work to reproduce something a job already had in memory. So each partial
 * carries its own model and this picks one.
 *
 * ---
 * WHAT IT DOES NOT DO
 *
 * It does not promote anything to the site. `model.json` lands in `data/`,
 * which is gitignored, and the backtest and the account page are rebuilt by a
 * person who has looked at the table first. A model that trains itself into
 * production on a schedule is how a bad number ships on a Sunday.
 *
 * Run: npm run train:merge
 */
import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.join(import.meta.dirname, '..');
const DATA = path.join(ROOT, 'data');
const PARTIALS = path.join(DATA, 'partials');

/* The order the comparison is read in. Technical is the baseline and has to be
   first; the rest follow the order they are defined in `train.mjs`. */
const ORDER = [
  'technical',
  'fundamental',
  'macro',
  '13f-ownership',
  'form-4-insiders',
  'earnings-language',
  'all-three-sec',
  'point-in-time-training',
  'point-in-time-all-sec',
];

if (!existsSync(PARTIALS)) {
  console.error('merge: no data/partials — run `npm run train -- --only=<slug>` first');
  process.exit(1);
}

const files = readdirSync(PARTIALS).filter((f) => f.endsWith('.json'));
if (!files.length) {
  console.error('merge: data/partials is empty');
  process.exit(1);
}

const bySlug = new Map();
for (const file of files) {
  const run = JSON.parse(readFileSync(path.join(PARTIALS, file), 'utf8'));
  if (!run?.slug || !Number.isFinite(run.meanIC)) {
    console.warn(`  ! ${file}: not a finished panel, skipped`);
    continue;
  }
  bySlug.set(run.slug, run);
}

const runs = [
  ...ORDER.filter((s) => bySlug.has(s)).map((s) => bySlug.get(s)),
  /* Anything new that has not been added to ORDER still gets reported. */
  ...[...bySlug.values()].filter((r) => !ORDER.includes(r.slug)),
];

const missing = ORDER.filter((s) => !bySlug.has(s));
console.log(`merge: ${runs.length} of ${ORDER.length} panels present`);
if (missing.length) console.log(`merge: missing — ${missing.join(', ')}`);

const baseline = runs.find((r) => r.slug === 'technical') ?? runs[0];

console.log('\npanel                          folds    mean IC        t   hit    vs baseline');
console.log('-'.repeat(78));
for (const r of runs) {
  const delta = r.meanIC - baseline.meanIC;
  console.log(
    `${r.name.padEnd(28)} ${String(r.years).padStart(4)}y `
    + `${(r.meanIC >= 0 ? '+' : '') + r.meanIC.toFixed(5)}`.padStart(10)
    + `${r.t.toFixed(2)}`.padStart(9)
    + `${(r.hitRate * 100).toFixed(1)}%`.padStart(7)
    + (r.slug === baseline.slug ? '        —' : `   ${(delta >= 0 ? '+' : '') + delta.toFixed(5)}`),
  );
}

mkdirSync(DATA, { recursive: true });
const payload = {
  /*
    When the panels actually ran, not when they were stitched together. The
    merge job starts minutes after the last walk-forward finishes and hours
    after the first one did, so stamping it with the merge time would date the
    whole comparison to its cheapest step.
  */
  trainedAt: runs.map((r) => r.trainedAt).filter(Boolean).sort().at(-1) ?? null,
  mergedAt: new Date().toISOString(),
  panels: runs.length,
  expected: ORDER.length,
  missing,
  /* `model` is dropped: training.json is the readable record, not a weights file. */
  runs: runs.map(({ model, ...rest }) => rest),
};
writeFileSync(path.join(DATA, 'training.json'), `${JSON.stringify(payload, null, 2)}\n`);
console.log('\nmerge: wrote data/training.json');

const best = [...runs].sort((a, b) => b.meanIC - a.meanIC)[0];
console.log(`merge: best by mean IC — ${best.name} at ${best.meanIC >= 0 ? '+' : ''}${best.meanIC.toFixed(5)}`);

if (best.model) {
  writeFileSync(path.join(DATA, 'model.json'), JSON.stringify(best.model));
  console.log(`merge: wrote data/model.json from ${best.slug}`);
} else {
  console.warn('merge: the best panel carries no model — nothing written to model.json');
}

/*
  A table CI can show without anybody opening an artifact. GitHub renders
  whatever is appended to this file at the top of the job's summary page.
*/
if (process.env.GITHUB_STEP_SUMMARY) {
  const rows = runs.map((r) => {
    const delta = r.meanIC - baseline.meanIC;
    return `| ${r.name} | ${r.meanIC >= 0 ? '+' : ''}${r.meanIC.toFixed(5)} | ${r.t.toFixed(2)} | `
      + `${(r.hitRate * 100).toFixed(1)}% | ${r.slug === baseline.slug ? '—' : (delta >= 0 ? '+' : '') + delta.toFixed(5)} |`;
  });
  writeFileSync(
    process.env.GITHUB_STEP_SUMMARY,
    [
      '## Walk-forward IC by panel',
      '',
      `Best: **${best.name}** at ${best.meanIC >= 0 ? '+' : ''}${best.meanIC.toFixed(5)}`,
      missing.length ? `\n:warning: missing panels: ${missing.join(', ')}` : '',
      '',
      '| panel | mean IC | t | hit rate | vs technical |',
      '|---|---:|---:|---:|---:|',
      ...rows,
      '',
      '_Nothing is promoted automatically. Rebuild the backtest and the account page by hand once this table has been read._',
      '',
    ].join('\n'),
    { flag: 'a' },
  );
}
