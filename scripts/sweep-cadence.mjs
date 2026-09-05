#!/usr/bin/env node
/**
 * HOW OFTEN SHOULD THE BOOK REBALANCE, AND HOW BIG A GAP IS WORTH PAYING FOR?
 *
 * ---
 *
 * TWO QUESTIONS THAT ONLY MAKE SENSE TOGETHER
 *
 * Rebalancing more often tracks the model more closely and costs more to do.
 * The no-trade band is the lever that decides which trades are worth it — so
 * sweeping cadence at a fixed band answers the wrong question. Daily with a
 * wide band and monthly with none are different strategies, not the same
 * strategy at two speeds.
 *
 * The monthly default was chosen because it matches the 21-day label the model
 * was trained on, and that argument is sound. But it was found by sweeping
 * rather than derived first, which makes it post-hoc until it is tested against
 * the alternatives on equal terms. This is that test.
 *
 * ---
 * AND IT RUNS ON BOTH UNIVERSES
 *
 * The concentration sweep taught this the hard way: its biased result said "25
 * names is the peak", and point-in-time the peak moved to 75 and the shape
 * changed. A construction choice validated only on the survivorship-biased
 * universe is a choice validated on a fiction.
 *
 * Run: npm run cadence            (biased universe)
 *      npm run cadence -- --pointInTime
 */
import path from 'node:path';
import { writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const ROOT = path.join(import.meta.dirname, '..');
const PIT = process.argv.includes('--pointInTime');

/* Daily, weekly, fortnightly, monthly, quarterly — in trading days. */
const CADENCES = [1, 5, 10, 21, 63];
const BANDS = [0, 0.005, 0.01, 0.02];

function run(rebalanceEvery, band) {
  const res = spawnSync(
    process.execPath,
    [
      '--experimental-strip-types',
      '--max-old-space-size=8192',
      '--import', './scripts/alias-register.mjs',
      'scripts/backtest.mjs',
      '--json',
      `--rebalanceEvery=${rebalanceEvery}`,
      `--band=${band}`,
      ...(PIT ? ['--pointInTime'] : []),
    ],
    { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 },
  );
  if (res.status !== 0) {
    console.error(`cadence: ${rebalanceEvery}d band ${band} failed`);
    console.error((res.stderr || '').split('\n').slice(-6).join('\n'));
    process.exit(1);
  }
  const line = res.stdout.trim().split('\n').filter((l) => l.startsWith('{')).pop();
  return JSON.parse(line);
}

const pct = (v) => `${(v * 100).toFixed(1)}%`;
const label = { 1: 'daily', 5: 'weekly', 10: 'fortnightly', 21: 'monthly', 63: 'quarterly' };

const rows = [];
for (const every of CADENCES) {
  for (const band of BANDS) {
    rows.push({ every, band, ...run(every, band) });
    process.stderr.write('.');
  }
}
process.stderr.write('\n');

const spy = rows[0].spy;
console.log('');
console.log(`  universe: ${PIT ? 'POINT-IN-TIME membership' : 'the index as it stands today (biased)'}`);
console.log(`  SPY: ${pct(spy.annual)} a year, Sharpe ${spy.sharpe.toFixed(2)}`);
console.log('');
console.log('  cadence       band    annual   Sharpe    maxDD   turnover   vs SPY');
for (const r of rows) {
  console.log(
    `  ${label[r.every].padEnd(12)} ${(r.band * 100).toFixed(1).padStart(5)}%  ` +
    `${pct(r.strategy.annual).padStart(7)}  ${r.strategy.sharpe.toFixed(2).padStart(6)}  ` +
    `${pct(r.strategy.maxDrawdown).padStart(7)}  ${r.turnover.toFixed(2).padStart(8)}  ` +
    `${pct(r.strategy.annual - spy.annual).padStart(7)}`,
  );
}

const best = [...rows].sort((a, b) => b.strategy.sharpe - a.strategy.sharpe)[0];
console.log('');
console.log(`  best Sharpe: ${label[best.every]} at a ${(best.band * 100).toFixed(1)}% band — ${best.strategy.sharpe.toFixed(2)}`);

/*
  The claim the default rests on: a 21-day label should favour a 21-day holding
  period. Stated explicitly so the answer is a finding rather than a preference.
*/
const byCadence = new Map();
for (const r of rows) {
  const cur = byCadence.get(r.every);
  if (!cur || r.strategy.sharpe > cur.strategy.sharpe) byCadence.set(r.every, r);
}
const ranked = [...byCadence.values()].sort((a, b) => b.strategy.sharpe - a.strategy.sharpe);
console.log(`  cadence ranking at each one's own best band: ${ranked.map((r) => label[r.every]).join(' > ')}`);
console.log(`  horizon-matching predicts monthly first — ${ranked[0].every === 21 ? 'CONFIRMED' : 'NOT CONFIRMED'}`);

writeFileSync(
  path.join(ROOT, 'data', PIT ? 'cadence-pit.json' : 'cadence.json'),
  `${JSON.stringify({ sweptAt: new Date().toISOString(), pointInTime: PIT, spy, rows }, null, 2)}\n`,
);
console.log(`\ncadence: wrote data/cadence${PIT ? '-pit' : ''}.json`);
