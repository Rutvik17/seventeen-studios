#!/usr/bin/env node
/**
 * HOW MANY NAMES SHOULD THE BOOK HOLD?
 *
 * ---
 *
 * WHY THIS IS A REAL QUESTION AND NOT A STYLE ONE
 *
 * The book held 97 names at roughly 2% each. That is a fifth of the index at
 * something close to equal weight, which is most of the way to owning the index
 * — and a strategy that mostly owns the index will mostly return the index,
 * whatever the model says.
 *
 * The argument the other way is not a slogan either. The measured information
 * coefficient is about +0.019: the model's ranking is right slightly more often
 * than not. Concentrating a thin edge into ten names does not make the edge
 * stronger, it makes the outcome noisier — the same expected return with far
 * more variance around it, and the variance is what a drawdown is made of.
 *
 * Grinold's approximation puts it plainly: the information ratio goes roughly
 * as IC x sqrt(breadth). Halve the names and you give up a fifth of the ratio
 * unless the names you drop were carrying no signal. Whether they were is an
 * empirical question about THIS model, which is what this sweeps.
 *
 * The tape makes it free: no retraining, one second per configuration.
 *
 * Run: npm run concentration
 */
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT = path.join(import.meta.dirname, '..');

/*
  Position counts worth asking about, from a Pershing-Square-shaped book to the
  one we have. maxLong has to move with the count or the cap does the
  concentrating instead of the count: at ten names a 4% ceiling cannot build a
  fully invested book, so it would quietly sit in cash and the comparison would
  be measuring exposure rather than concentration.
*/
const COUNTS = [8, 12, 15, 20, 25, 30, 40, 50, 75, Infinity];
const capFor = (n) => (Number.isFinite(n) ? Math.min(0.22, Math.max(0.04, 2.4 / n)) : 0.04);

const rows = [];
for (const n of COUNTS) {
  const res = spawnSync(
    process.execPath,
    [
      '--experimental-strip-types',
      '--max-old-space-size=8192',
      '--import', './scripts/alias-register.mjs',
      'scripts/backtest.mjs',
      '--json',
      `--maxNames=${n}`,
      `--maxLong=${capFor(n)}`,
    ],
    { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 },
  );
  if (res.status !== 0) {
    console.error(`concentration: ${n} failed`);
    console.error((res.stderr || '').split('\n').slice(-6).join('\n'));
    process.exit(1);
  }
  const line = res.stdout.trim().split('\n').filter((l) => l.startsWith('{')).pop();
  if (!line) {
    console.error(`concentration: ${n} produced no JSON`);
    process.exit(1);
  }
  rows.push({ names: n, cap: capFor(n), ...JSON.parse(line) });
  process.stderr.write('.');
}
process.stderr.write('\n');

const pct = (v) => `${(v * 100).toFixed(1)}%`;
const spy = rows[0].spy;

console.log('');
console.log(`  SPY over the same window: ${pct(spy.annual)} a year, Sharpe ${spy.sharpe.toFixed(2)}, worst drawdown ${pct(spy.maxDrawdown)}`);
console.log('');
console.log('  names   cap    held   annual    vol   Sharpe    maxDD   vs SPY   yrs ahead');
for (const r of rows) {
  const label = Number.isFinite(r.names) ? String(r.names) : 'all';
  console.log(
    `  ${label.padStart(5)}  ${(r.cap * 100).toFixed(0).padStart(3)}%  ${String(r.avgHeld).padStart(5)}  ` +
    `${pct(r.strategy.annual).padStart(7)}  ${pct(r.strategy.vol).padStart(6)}  ` +
    `${r.strategy.sharpe.toFixed(2).padStart(6)}  ${pct(r.strategy.maxDrawdown).padStart(7)}  ` +
    `${pct(r.strategy.annual - spy.annual).padStart(7)}  ${String(r.yearsAhead).padStart(5)}/${r.years}`,
  );
}
console.log('');

const bySharpe = [...rows].sort((a, b) => b.strategy.sharpe - a.strategy.sharpe);
const byReturn = [...rows].sort((a, b) => b.strategy.annual - a.strategy.annual);
const name = (r) => (Number.isFinite(r.names) ? `${r.names} names` : 'unlimited');
console.log(`  best Sharpe : ${name(bySharpe[0])} at ${bySharpe[0].strategy.sharpe.toFixed(2)}`);
console.log(`  best return : ${name(byReturn[0])} at ${pct(byReturn[0].strategy.annual)}`);
console.log('');

writeFileSync(
  path.join(ROOT, 'data', 'concentration.json'),
  `${JSON.stringify({ sweptAt: new Date().toISOString(), spy, rows }, null, 2)}\n`,
);
console.log('concentration: wrote data/concentration.json');
