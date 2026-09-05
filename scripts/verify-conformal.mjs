#!/usr/bin/env node
/**
 * DO THE CONFORMAL INTERVALS ACTUALLY COVER?
 *
 * The whole reason to prefer conformal over an assumed distribution is that its
 * promise is checkable. A 90% interval must contain the outcome about 90% of
 * the time — and if it comes back at 70%, the exchangeability assumption has
 * failed on this data and the intervals are decoration after all.
 *
 * Split conformal, done honestly: calibrate on days whose outcome was ALREADY
 * KNOWN, then test on a later day. Calibration ends at least one horizon before
 * the test day, or the outcome leaks into its own interval.
 *
 * Run: npm run conformal   (part of `npm run verify`)
 */
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { conformalWidth } from '../src/lib/engine/conformal.ts';

const ROOT = path.join(import.meta.dirname, '..');
const TAPE = path.join(ROOT, 'data', 'tape.json');
if (!existsSync(TAPE)) {
  console.log('conformal: no data/tape.json — skipping.');
  process.exit(0);
}
const t = JSON.parse(readFileSync(TAPE, 'utf8'));
const { dates, scores, close } = t;
const H = 21;

/* Realised 21-day excess return, matching the label the model was trained on. */
function residualsOn(day) {
  const out = [];
  if (day + H >= dates.length) return out;
  const m0 = t.market[day].close, m1 = t.market[day+H].close;
  const mkt = m1/m0 - 1;
  for (let s = 0; s < t.symbols.length; s++) {
    const sc = scores[day][s];
    if (sc == null) continue;
    const p0 = close[day][s], p1 = close[day+H][s];
    if (!(p0 > 0) || !(p1 > 0)) continue;
    out.push({ score: sc, realised: p1/p0 - 1 - mkt });
  }
  return out;
}

/*
  Split conformal, done honestly: calibrate on days whose outcome was already
  known, then test on a LATER day. Calibration must end at least H days before
  the test day or the outcome leaks into its own interval.
*/
console.log('conformal: split calibration, tested on later days only');
console.log('  alpha  nominal   measured   width      n');
let failures = 0;
for (const alpha of [0.5, 0.2, 0.1, 0.05]) {
  let covered = 0, total = 0, widthSum = 0, tests = 0;
  for (let day = 600; day + H < dates.length; day += 63) {
    const cal = [];
    for (let d = day - 252; d < day - H; d += 5) cal.push(...residualsOn(d));
    if (cal.length < 500) continue;
    const w = conformalWidth(cal.map(r => r.realised - r.score), alpha);
    if (!Number.isFinite(w)) continue;
    const test = residualsOn(day);
    for (const r of test) { total++; if (Math.abs(r.realised - r.score) <= w) covered++; }
    widthSum += w; tests++;
  }
  const measured = covered / total;
  console.log('    '+alpha.toFixed(2), String((1-alpha)*100).padStart(7)+'%',
    String((measured*100).toFixed(1)).padStart(9)+'%',
    (widthSum/tests*100).toFixed(2).padStart(7)+'%', String(total).padStart(8));

  /*
    Under-coverage is the failure that matters: an interval narrower than it
    claims is a confidence estimate that lies. Over-coverage is conservative and
    expected — the finite-sample correction deliberately errs that way — so the
    band is asymmetric on purpose.
  */
  if (measured < (1 - alpha) - 0.03) { failures += 1; console.error(`    ^ UNDER-COVERS by ${(((1-alpha)-measured)*100).toFixed(1)} points`); }
  if (measured > (1 - alpha) + 0.10) { failures += 1; console.error('    ^ over-covers badly: the intervals are uselessly wide'); }
}

if (failures) {
  console.error(`
conformal: FAIL — ${failures} level(s) outside tolerance`);
  process.exit(1);
}
console.log('conformal: PASS — coverage holds at every level, no distributional assumption used');
