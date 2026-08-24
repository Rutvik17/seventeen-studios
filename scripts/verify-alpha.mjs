/**
 * Runs the alpha model over the panel and prints what it found.
 *
 *   npm run alpha
 *
 * A sanity check, not a test suite. The failure modes of a factor backtest are
 * quiet: a Sharpe above 3, a net beta far from zero, a covariance that could not
 * be inverted, or a parameter that changes nothing all look like success until
 * the numbers are next to each other.
 *
 * Two of those were caught here rather than on the page. Net beta ran to −0.80
 * on a book whose entire purpose is to have none, and the risk-aversion term
 * produced identical returns at 3, 8 and 20 because a gross-exposure constraint
 * divides a uniform scale straight back out.
 */

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { runAlpha, ALPHA } from '../src/lib/alpha.ts';
import { DIRECTION, FACTORS } from '../src/lib/factors.ts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const data = JSON.parse(readFileSync(path.join(root, 'src', 'content', 'alpha.json'), 'utf8'));

const input = {
  symbols: data.universe.map((u) => u.symbol),
  industries: data.universe.map((u) => u.industry),
  monthEnds: data.monthEnds,
  closes: data.closes,
  months: data.months,
};

const pct = (v) => `${(v * 100).toFixed(2)}%`;

console.log(`\n${input.symbols.length} names, ${new Set(input.industries).size} industries, ${data.months.length} formation months\n`);

console.log('settings                 months  total      ann        vol       sharpe  maxDD      hit      turnover  degen');
console.log('-'.repeat(108));

for (const [label, overrides] of [
  ['defaults', {}],
  ['no costs', { costBps: 0 }],
  ['no risk model (tilt 0)', { tilt: 0 }],
  ['light shrinkage', { shrinkage: 0.1 }],
  ['quintiles', { decile: 0.2 }],
]) {
  const m = runAlpha(input, { ...ALPHA, ...overrides }).metrics;
  console.log(
    `${label.padEnd(24)} ${String(m.months).padEnd(7)} ${pct(m.totalReturn).padEnd(10)} ` +
      `${pct(m.annualised).padEnd(10)} ${pct(m.volatility).padEnd(9)} ` +
      `${m.sharpe.toFixed(2).padEnd(7)} ${pct(m.maxDrawdown).padEnd(10)} ` +
      `${pct(m.hitRate).padEnd(8)} ${pct(m.averageTurnover).padEnd(9)} ${m.degenerate}`,
  );
}

/*
  Each factor alone, at its declared sign.

  The single most useful table in a multi-factor backtest, because a composite
  hides everything: a model can look flat while one leg earns steadily and
  another gives it all back, and those two facts are worth far more than their
  sum. It is also the check that separates a sign error from a bad regime — a
  systematic flip makes every row negative, and a regime does not.
*/
const saved = { ...DIRECTION };

/*
  EXCESS over the equal-weighted universe, not absolute return.

  In a long-only book every factor scores twenty percent a year, because every
  factor is mostly measuring the market. The first version of this table said
  exactly that and it was useless — momentum, volatility and reversal all looked
  like triumphs in a period when two of them were known to be failing.

  Subtracting the universe's own return leaves the part attributable to choosing
  these names over the others, which is the only part the model is responsible
  for.
*/
const universe = [];
for (let i = 1; i < data.monthEnds.length; i++) {
  const moves = [];
  for (const symbol of input.symbols) {
    const a = data.closes[symbol]?.[i - 1];
    const b = data.closes[symbol]?.[i];
    if (a && b && a > 0) moves.push(b / a - 1);
  }
  if (moves.length) moves.length && universe.push(moves.reduce((x, y) => x + y, 0) / moves.length);
}

const annualise = (rs) => rs.reduce((p, v) => p * (1 + v), 1) ** (12 / rs.length) - 1;
const benchmark = annualise(universe);

console.log(`\nEach factor alone, as EXCESS over the universe (${pct(benchmark)} a year)`);
console.log('factor              sign  excess      sharpe  hit');
console.log('-'.repeat(52));

for (const factor of FACTORS) {
  if (saved[factor] === 0) continue;
  for (const other of FACTORS) DIRECTION[other] = other === factor ? saved[other] : 0;
  const m = runAlpha(input, { ...ALPHA, costBps: 0 }).metrics;
  const excess = m.annualised - benchmark;
  console.log(
    `${factor.padEnd(19)} ${String(saved[factor]).padStart(2)}   ` +
      `${(excess >= 0 ? '+' : '') + pct(excess).padEnd(10)} ${m.sharpe.toFixed(2).padEnd(7)} ${pct(m.hitRate)}`,
  );
}
for (const other of FACTORS) DIRECTION[other] = saved[other];

const all = runAlpha(input, { ...ALPHA, costBps: 0 }).metrics;
console.log(`${'all seven'.padEnd(19)}      ${'+' + pct(all.annualised - benchmark)}`);

/* Neutrality is a claim the book makes about itself, so it is checked. */
const base = runAlpha(input);
const betas = base.months.map((m) => m.netBeta).sort((a, b) => a - b);
const median = betas[Math.floor(betas.length / 2)];
console.log(
  `\nnet beta: min ${betas[0].toFixed(4)}  median ${median.toFixed(4)}  ` +
    `max ${betas[betas.length - 1].toFixed(4)}`,
);

const last = base.months.at(-1);
console.log(`\nlast rebalance — formed ${last.formed}, held into ${last.held}`);
const show = (hs) => hs.slice(0, 6).map((h) => `${h.symbol} ${(h.weight * 100).toFixed(1)}%`).join('  ');
console.log(`  long : ${show(last.longs)}`);
console.log(`  short: ${show(last.shorts)}`);
console.log(`  gross ${pct(last.gross)}  net ${pct(last.net)}  turnover ${pct(last.turnover)}\n`);
