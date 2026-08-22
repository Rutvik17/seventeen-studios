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

/* ---------- steepness, "Steepness" ---------- */

check('slope: 1.40 / 0.50', 1.4 / 0.5, 2.8, 1e-9);

console.log();
if (failures > 0) {
  console.error(`${failures} claim(s) do not match their formula.`);
  process.exit(1);
}
console.log('All notebook claims match their formulas.');
