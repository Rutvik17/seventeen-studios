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

import { POWER_MODES, averageCurrentMa, batteryDays } from '../src/lib/board.ts';
import { SCENE_DRIVE, PANEL_CONTRAST, boostInputCurrentMa } from '../src/lib/oled.ts';

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

/*
  IMPORTED FROM `lib/board.ts`, NOT RETYPED HERE.

  This block used to hold its own copy of the power modes, and that is the exact
  failure this whole file exists to catch — one number in two places drifts, and
  a checker with a stale copy agrees enthusiastically with a stale paragraph.

  It happened: the board gained a fourth mode when the OLED went on it, and this
  file went on verifying a three-mode budget that no longer described anything.
  Both agreed, both were wrong, and the run stayed green.

  Importing the real table means adding a mode CANNOT leave the check behind.
*/
const duty = POWER_MODES.reduce((s, m) => s + m.dutyCycle, 0);
check('power: duty cycles sum to 1', duty, 1.0, 1e-9);

const avg = averageCurrentMa();
check('power: average current (mA)', avg, 4.00, 0.01);
check('power: radio contribution (mA)', 240 * 0.0035, 0.84);
// The OLED is now the largest single contributor, which is the lesson's point.
const oled = POWER_MODES.find((m) => /OLED/.test(m.name));
check('power: OLED contribution (mA)', oled.milliamps * oled.dutyCycle, 3.07, 0.01);
/*
  The companion's brightness is not a preference, it is what the power budget
  allows given how much of the panel the artwork lights. Both halves are
  asserted, because a claim that only checks the chosen value would still pass
  if the constraint that forced it quietly went away.
*/
check('power: at full contrast the scene would blow the budget', boostInputCurrentMa(SCENE_DRIVE, 1), 112.9, 0.5);
check('power: at the chosen contrast it fits', boostInputCurrentMa(SCENE_DRIVE * PANEL_CONTRAST, 1), 38.40, 0.05);

check('power: battery life derated (days)', batteryDays(1200, avg), 10.7, 0.1);
check('power: battery life undated (days)', 1200 / avg / 24, 12.5, 0.1);

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
const frozenModel = JSON.parse(
  readFileSync(new URL('../src/content/sentiment-model.json', import.meta.url), 'utf8'),
);
const survivorship = JSON.parse(
  readFileSync(new URL('../src/content/survivorship.json', import.meta.url), 'utf8'),
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
  /*
    The site quotes the REPRODUCIBLE survivorship measurement, so the checks are
    that its arithmetic holds and that it still says what the page says.

    The older end-to-end figure is deliberately not asserted: its method was
    never committed, so there is nothing to check it against. Recording that it
    is unverifiable is more honest than testing it against itself.
  */
  const sv = survivorship.measured;
  const svDrop = (sv.meanIC.members - sv.meanIC.all) / sv.meanIC.all;
  assert(
    'survivorship: the quoted fall follows from the two ICs',
    Math.abs(svDrop - sv.change) < 5e-3,
    `${(svDrop * 100).toFixed(1)}% vs stored ${(sv.change * 100).toFixed(1)}%`,
  );
  assert(
    'survivorship: dating membership does not help the model',
    sv.meanIC.members < sv.meanIC.all,
    `+${sv.meanIC.members} vs +${sv.meanIC.all}`,
  );
  assert(
    'survivorship: membership covers the backtest',
    sv.membershipRange[0] <= '2013-01-02' && sv.membershipRange[1] >= '2026-01-01',
    `${sv.membershipRange[0]} to ${sv.membershipRange[1]}, ${sv.snapshots} snapshots`,
  );
  assert(
    'survivorship: the unreproducible figure is marked as such',
    survivorship.endToEnd.reproducible === false,
    'endToEnd carries no script',
  );

  /*
    The shipped model must BE the frozen one.

    The build used to re-fit on every run, which quietly replaced the model this
    entry is a write-up of — every figure below described a training run that no
    longer existed, and the prose inverted the first time the data moved far
    enough. Fitting is now deliberate (`npm run fit:sentiment`); this claim is
    what stops it creeping back into the build.
  */
  const pinned = ['bias', 'weights', 'mean', 'std', 'quantiles'].every(
    (k) => JSON.stringify(model[k]) === JSON.stringify(frozenModel[k]),
  );
  assert(
    'model: shipped weights are the frozen ones',
    pinned && model.test.n === frozenModel.test.n,
    `fitted ${frozenModel.fittedAt}`,
  );

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

/* ---------- the lesson's own code, "Guessing well" ---------- */

/*
  A lesson that hands the reader code has to be checked BY RUNNING THAT CODE.
  The figure quoted beside it was wrong on the first pass — $210,000 against an
  actual $255,000 — which is exactly the kind of thing that survives proofreading
  and destroys a reader's afternoon when their output does not match the page.

  This is the lesson's listing, transcribed, run against the same inputs.
*/
function lessonNormals() {
  let spare = null;
  return function draw() {
    if (spare !== null) { const v = spare; spare = null; return v; }
    let u, v, s;
    do {
      u = Math.random() * 2 - 1;
      v = Math.random() * 2 - 1;
      s = u * u + v * v;
    } while (s >= 1 || s === 0);
    const f = Math.sqrt((-2 * Math.log(s)) / s);
    spare = v * f;
    return u * f;
  };
}

/** Inverse standard normal — Acklam, enough for a default threshold. */
function normalQuantileLocal(p) {
  const a = [-39.69683028665376, 220.9460984245205, -275.9285104469687,
             138.357751867269, -30.66479806614716, 2.506628277459239];
  const b = [-54.47609879822406, 161.5858368580409, -155.6989798598866,
             66.80131188771972, -13.28068155288572];
  const c = [-0.007784894002430293, -0.3223964580411365, -2.400758277161838,
             -2.549732539343734, 4.374664141464968, 2.938163982698783];
  const d = [0.007784695709041462, 0.3224671290700398, 2.445134137142996,
             3.754408661907416];
  const pl = 0.02425;
  if (p < pl) {
    const q = Math.sqrt(-2 * Math.log(p));
    return (((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5]) /
           ((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1);
  }
  const q = p - 0.5;
  const r = q * q;
  return (((((a[0]*r+a[1])*r+a[2])*r+a[3])*r+a[4])*r+a[5]) * q /
         (((((b[0]*r+b[1])*r+b[2])*r+b[3])*r+b[4])*r+1);
}

function lessonTerminal(start, drift, vol, years, z) {
  return start * Math.exp((drift - (vol * vol) / 2) * years + vol * Math.sqrt(years) * z);
}

{
  const paths = 200_000;
  const draw = lessonNormals();
  const out = new Float64Array(paths);
  for (let i = 0; i < paths; i++) out[i] = lessonTerminal(1_000_000, 0.07, 0.36, 0.25, draw());
  out.sort();
  const simulated = 1_000_000 - out[Math.floor(0.05 * paths)];

  // The closed form for the same quantile. -1.6449 is the 5% point of the
  // standard normal.
  const exact =
    1_000_000 -
    1_000_000 * Math.exp((0.07 - (0.36 * 0.36) / 2) * 0.25 + 0.36 * Math.sqrt(0.25) * -1.6449);

  check('lesson code: VaR matches the quoted figure', simulated, 255_000, 8_000);
  assert(
    'lesson code: simulation agrees with the closed form',
    Math.abs(simulated - exact) / exact < 0.02,
    `${Math.round(simulated).toLocaleString()} vs ${Math.round(exact).toLocaleString()}`,
  );
}

/* ---------- correlated defaults, "What a lender is afraid of" ---------- */

/*
  The lesson claims that at rho = 0 the worst year in a hundred is "barely above
  the average", and at rho = 0.2 it is "several times" it. Both are checkable by
  running the lesson's own listing, so both are.
*/
{
  const draw = lessonNormals();
  const threshold = normalQuantileLocal(0.03);

  const book = (rho) => {
    const losses = [];
    for (let s = 0; s < 3000; s++) {
      const economy = draw();
      let defaults = 0;
      for (let i = 0; i < 2000; i++) {
        const z = Math.sqrt(rho) * economy + Math.sqrt(1 - rho) * draw();
        if (z < threshold) defaults += 1;
      }
      losses.push(defaults * 4200 * 0.75);
    }
    losses.sort((a, b) => a - b);
    const expected = losses.reduce((a, b) => a + b, 0) / losses.length;
    return losses[Math.floor(0.99 * losses.length)] / expected;
  };

  const independent = book(0);
  const correlated = book(0.2);

  assert(
    'credit: uncorrelated book is barely worse than average',
    independent < 1.6,
    `${independent.toFixed(2)}x`,
  );
  assert(
    'credit: correlated book is several times worse',
    correlated > 3,
    `${correlated.toFixed(2)}x`,
  );
}

/* ---------- steepness, "Steepness" ---------- */

check('slope: 1.40 / 0.50', 1.4 / 0.5, 2.8, 1e-9);

/*
  The founder page's figures used to be checked here — GPIO pitch, LPDDR4
  bandwidth, the SPI framebuffer and its clock time, the panel's PPI on both
  axes. They went out with the working column that printed them: this file
  exists to catch a printed number drifting from its formula, so a claim about
  a number nothing prints is a test with no subject.

  They come back with the surface. `git show ccb69d4 -- scripts/verify-claims.mjs`
*/

console.log();
if (failures > 0) {
  console.error(`${failures} claim(s) do not match their formula.`);
  process.exit(1);
}
console.log('All notebook claims match their formulas.');
