#!/usr/bin/env node
/**
 * Check every number asserted in the notebook against the formula that produces
 * it.
 *
 * ---
 *
 * WHY THIS EXISTS
 *
 * The site's stated rule is that every figure on it is computed and shows its
 * working. That is only worth anything if the printed result actually equals
 * what the printed working produces — and prose drifts. A constant gets tuned in
 * `lib/board.ts`, the paragraph quoting it does not move, and the entry now
 * teaches a wrong number with a correct-looking derivation beside it. That is
 * worse than no number, because it is confidently wrong.
 *
 * This caught one on its first run: the trace-width entry claimed a
 * cross-section of 6.27 where the formula gives 6.264. Small, and exactly the
 * kind of thing proofreading never finds — the digits look right.
 *
 * Borrowed wholesale from Grasp, where the same rule is enforced by a test
 * suite and for the same reason: wrong arithmetic in something that teaches is
 * worse than no teaching at all.
 *
 * Run: node scripts/verify-claims.mjs   (also runs as part of `npm run verify`)
 */

let failures = 0;

/**
 * A boolean assertion, for the checks that are not "this number equals that
 * number" — kept separate from `check` rather than overloading it, because a
 * boolean silently reaching the numeric path throws on `toFixed` and the whole
 * run dies instead of reporting.
 */
function assert(label, condition, detail = '') {
  if (!condition) failures += 1;
  console.log(`  ${condition ? 'ok  ' : 'FAIL'} ${label}${detail ? ` — ${detail}` : ''}`);
}

function check(label, actual, claimed, tolerance = 0.005) {
  const pass = Math.abs(actual - claimed) <= tolerance;
  if (!pass) failures += 1;
  const mark = pass ? '  ok  ' : '  FAIL';
  console.log(
    `${mark} ${label.padEnd(48)} computed ${String(+actual.toFixed(5)).padEnd(12)} claimed ${claimed}`,
  );
}

/* ---------- IPC-2221A, "A thing that tells you something" ---------- */

const k = 0.048; // external layer
const area = Math.pow(0.5 / (k * Math.pow(10, 0.44)), 1 / 0.725);
check('trace: cross-section A (sq mils)', area, 6.26);

const mils = area / (1 * 1.378);
check('trace: width (mils)', mils, 4.55, 0.01);
check('trace: width (mm)', mils * 0.0254, 0.116, 0.001);

/* ---------- crystal load ---------- */

check('crystal: C1 = 2(12.5 - 3) pF', 2 * (12.5 - 3), 19);
check('crystal: 18 pF pair gives C_L', (18 * 18) / (18 + 18) + 3, 12.0);

/* ---------- power budget ---------- */

const modes = [
  { mA: 0.043, duty: 0.9945 },
  { mA: 240, duty: 0.0035 },
  { mA: 26, duty: 0.002 },
];
const duty = modes.reduce((s, m) => s + m.duty, 0);
check('power: duty cycles sum to 1', duty, 1.0, 1e-9);

const avg = modes.reduce((s, m) => s + m.mA * m.duty, 0);
check('power: average current (mA)', avg, 0.93);
check('power: radio contribution (mA)', 240 * 0.0035, 0.84);
check('power: battery life derated (days)', (1200 * 0.85) / avg / 24, 45, 0.6);
check('power: battery life undated (days)', 1200 / avg / 24, 54, 0.6);

/* ---------- credit risk, "What a lender is afraid of" ---------- */

check('credit: EL = 0.03 x 4200 x 0.75', 0.03 * 4200 * 0.75, 94.5);

/* ---------- coin flips, "Guessing well" ---------- */

const choose = (n, r) => {
  let out = 1;
  for (let i = 0; i < r; i++) out = (out * (n - i)) / (i + 1);
  return out;
};
check(
  'coins: P(exactly 7 heads of 10) %',
  choose(10, 7) * Math.pow(0.5, 10) * 100,
  11.71875,
  1e-6,
);

/* ---------- diversification, "Guessing well" ---------- */

import { readFileSync } from 'node:fs';
const market = JSON.parse(
  readFileSync(new URL('../src/content/market.json', import.meta.url), 'utf8'),
);

const n = market.assets.length;
const w = 1 / n;
let variance = 0;
for (let i = 0; i < n; i++) {
  for (let j = 0; j < n; j++) {
    variance +=
      w * w * market.correlations[i][j] *
      market.assets[i].volatility * market.assets[j].volatility;
  }
}
const portfolioVol = Math.sqrt(variance);
const averageVol = market.assets.reduce((s, a) => s + w * a.volatility, 0);

check('portfolio: average of the parts (%)', averageVol * 100, 51, 2);
check('portfolio: actual portfolio vol (%)', portfolioVol * 100, 36, 2);
check('portfolio: diversification gain (pts)', (averageVol - portfolioVol) * 100, 15, 2);

// The claim that matters is directional and must hold for ANY weights, not just
// these — a portfolio can never be riskier than the average of its parts unless
// a correlation exceeds 1, which is impossible.
if (portfolioVol >= averageVol) {
  console.log('  FAIL portfolio vol is not below the weighted average');
  failures += 1;
} else {
  console.log('  ok   portfolio: vol is below the weighted average'.padEnd(56));
}

/* ---------- the sentiment model, "A face that guesses" ---------- */

const model = market.sentiment;
if (!model) {
  console.log('  FAIL sentiment model missing from market.json');
  failures += 1;
} else {
  // The entry's whole argument is that the model does NOT beat the base rate.
  // If a retrain ever flipped that, the prose would become wrong — so the claim
  // is asserted rather than assumed.
  const beatsBase = model.test.accuracy > model.test.baseRate;
  console.log(
    (beatsBase ? '  FAIL' : '  ok  ') +
      ' model: test accuracy does not beat the base rate'.padEnd(49) +
      ` computed ${(model.test.accuracy * 100).toFixed(1)}%   base ${(model.test.baseRate * 100).toFixed(1)}%`,
  );
  if (beatsBase) failures += 1;

  // Evaluated on days it never saw, chronologically after training.
  assert('model: train and test both have rows', model.train.n > 0 && model.test.n > 0, `${model.train.n} / ${model.test.n}`);

  // The face maps a percentile, which needs a non-degenerate output range.
  const span = model.quantiles[model.quantiles.length - 1] - model.quantiles[0];
  assert('model: output band is non-degenerate', span > 0.002, `${(span * 100).toFixed(2)} pts`);

  // Standardisation statistics must ship, or inference silently uses raw
  // features against weights fitted on standardised ones.
  assert(
    'model: ships its standardisation stats',
    model.mean.length === model.weights.length && model.std.length === model.weights.length,
  );
  assert('model: no zero standard deviations', model.std.every((v) => v !== 0));
}

/* ---------- steepness, "Steepness" ---------- */

check('slope: 1.40 / 0.50', 1.4 / 0.5, 2.8, 1e-9);

console.log();
if (failures > 0) {
  console.error(`${failures} claim(s) do not match their formula.`);
  process.exit(1);
}
console.log('All notebook claims match their formulas.');
