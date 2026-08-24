/**
 * Runs the liquidity-sweep model over every ticker and prints what it found.
 *
 *   npm run sweep
 *
 * This is a sanity check, not a test suite. It exists because the failure modes
 * of a backtest are quiet: a model that produces four trades, or a 95% win rate,
 * or an average reward-to-risk of 40, has a bug rather than an edge — and none
 * of those look wrong until the numbers are on screen next to each other.
 *
 * The funnel is printed in full for the same reason. Where the Mondays go is the
 * part that says whether the filters are selecting a real pattern or grinding
 * the sample down to whatever happened to work.
 */

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { backtest, monteCarlo, DEFAULTS } from '../src/lib/sweep.ts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const data = JSON.parse(readFileSync(path.join(root, 'src', 'content', 'sweep.json'), 'utf8'));

const toDaily = (rows) =>
  rows.map(([date, open, high, low, close]) => ({ date, open, high, low, close }));

const toSessions = (byDay) =>
  Object.fromEntries(
    Object.entries(byDay).map(([day, rows]) => [
      day,
      rows.map(([time, open, high, low, close]) => ({ time, open, high, low, close })),
    ]),
  );

const pct = (v) => `${(v * 100).toFixed(1)}%`;
const num = (v, d = 2) => (Number.isFinite(v) ? v.toFixed(d) : '—');

console.log(`\nParameters: ${JSON.stringify(DEFAULTS)}\n`);

const header =
  'ticker  mondays  traded  win%   expect   totalR  PF    maxDD  Sharpe  plannedRR';
console.log(header);
console.log('-'.repeat(header.length));

const all = [];

for (const ticker of data.tickers) {
  const daily = toDaily(ticker.daily);
  const sessions = toSessions(ticker[process.argv[2] === 'fine' ? 'fine' : 'hourly']);
  const result = backtest(daily, sessions);
  const m = result.metrics;
  all.push({ ticker, result });

  console.log(
    `${ticker.symbol.padEnd(7)} ${String(result.funnel.mondays).padEnd(8)} ` +
      `${String(m.trades).padEnd(7)} ${pct(m.winRate).padEnd(6)} ` +
      `${num(m.expectancy).padEnd(8)} ${num(m.totalR, 1).padEnd(7)} ` +
      `${num(m.profitFactor).padEnd(5)} ${num(m.maxDrawdown, 1).padEnd(6)} ` +
      `${num(m.sharpe).padEnd(7)} ${num(m.avgPlannedRR)}`,
  );
}

/* Where the Mondays went, pooled — the same funnel for every ticker at once. */
const pooled = {};
let pooledTrades = [];
for (const { result } of all) {
  for (const [key, value] of Object.entries(result.funnel)) {
    pooled[key] = (pooled[key] ?? 0) + value;
  }
  pooledTrades = pooledTrades.concat(result.trades);
}

console.log('\nWhere the Mondays went (all seven pooled)');
const order = [
  'mondays',
  'holiday-week',
  'no-weekly-bars',
  'thursday-not-higher',
  'friday-closed-strong',
  'no-sweep',
  'no-structure-shift',
  'no-gap',
  'reward-too-small',
  'never-filled',
  'traded',
];
for (const key of order) {
  const value = pooled[key] ?? 0;
  const share = pooled.mondays ? ` (${pct(value / pooled.mondays)})` : '';
  console.log(`  ${key.padEnd(22)} ${String(value).padStart(5)}${key === 'mondays' ? '' : share}`);
}

/* Outcome mix — a model whose trades all time out is not being tested. */
const outcomes = pooledTrades.reduce((acc, t) => {
  acc[t.outcome] = (acc[t.outcome] ?? 0) + 1;
  return acc;
}, {});
console.log('\nHow trades ended');
for (const [k, v] of Object.entries(outcomes)) {
  console.log(`  ${k.padEnd(22)} ${String(v).padStart(5)} (${pct(v / pooledTrades.length)})`);
}

if (pooledTrades.length) {
  const risk = monteCarlo(pooledTrades, { riskFraction: 0.01 });
  console.log('\nMonte Carlo, pooled trades, 1% risk per trade, 5000 runs');
  console.log(`  median drawdown        ${pct(risk.medianDrawdown)}`);
  console.log(`  95th percentile        ${pct(risk.p95Drawdown)}`);
  console.log(`  risk of ruin (−50%)    ${pct(risk.riskOfRuin)}`);
  console.log(`  median growth          ${num(risk.medianGrowth)}x`);
}

console.log('');
