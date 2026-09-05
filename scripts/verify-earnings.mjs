#!/usr/bin/env node
/**
 * DOES THE EARNINGS-LANGUAGE JOIN LEAK THE FUTURE?
 *
 * Asked of every family that arrives on a schedule, and asked separately of
 * each, because the three are lagged by three different mechanisms:
 *
 *   13F        a statutory deadline computed from the period end
 *   Form 4     the filing date carried in the record
 *   earnings   the filing date IS the announcement — no lag at all
 *
 * The third is the one most likely to be got wrong precisely because it needs
 * nothing done to it. There is no deadline to compute and no window to slide,
 * so a mistake here looks like correct code.
 *
 * The test is mechanical: a feature may only change on a day a release was
 * filed. Any other movement means the walk is reading a release before it
 * existed.
 *
 * Run: npm run earnings:verify   (part of `npm run verify`)
 */
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { languageRows, LANGUAGE_COLUMNS, tone, hedging } from '../src/lib/engine/language.ts';

const ROOT = path.join(import.meta.dirname, '..');
const FILE = path.join(ROOT, 'data', 'earnings.json');

if (!existsSync(FILE)) {
  console.log('earnings: no data/earnings.json — run `npm run earnings` first. Skipping.');
  process.exit(0);
}

const { releases } = JSON.parse(readFileSync(FILE, 'utf8'));
if (!releases.length) {
  console.log('earnings: no releases in the file. Skipping.');
  process.exit(0);
}

const symbols = [...new Set(releases.map((r) => r.symbol))].slice(0, 8);

/* Daily dates spanning the data, so every filing falls inside the walk. */
const first = releases[0].date;
const last = releases[releases.length - 1].date;
const dates = [];
for (let d = new Date(first); d <= new Date(last); d.setDate(d.getDate() + 1)) {
  dates.push(d.toISOString().slice(0, 10));
}

let moves = 0;
let unexplained = 0;
const examples = [];

for (const symbol of symbols) {
  const rows = languageRows(releases, symbol, dates);
  const filed = new Set(releases.filter((r) => r.symbol === symbol).map((r) => r.date));

  for (let i = 1; i < rows.length; i++) {
    /*
      `lang_days_since` counts up every single day, so it is excluded — it is
      the one column that SHOULD move without a filing, and including it would
      make this test pass on 365 movements a year regardless of the join.
    */
    let changed = false;
    for (let c = 0; c < LANGUAGE_COLUMNS.length; c++) {
      if (LANGUAGE_COLUMNS[c] === 'lang_days_since') continue;
      const a = rows[i - 1][c];
      const b = rows[i][c];
      if (Number.isFinite(a) !== Number.isFinite(b)
        || (Number.isFinite(a) && Math.abs(a - b) > 1e-12)) { changed = true; break; }
    }
    if (!changed) continue;

    moves += 1;
    if (filed.has(dates[i])) continue;
    unexplained += 1;
    if (examples.length < 5) examples.push(`${symbol} ${dates[i]}`);
  }
}

console.log(`earnings: ${symbols.length} symbols over ${dates.length} days, ${moves} feature moves`);

if (unexplained) {
  console.error(`earnings: FAIL — ${unexplained} move(s) with no release filed that day`);
  console.error(`      e.g. ${examples.join(', ')}`);
  process.exit(1);
}
if (!moves) {
  console.error('earnings: FAIL — nothing moved, so this proves nothing');
  process.exit(1);
}
console.log('earnings: PASS — every move lands on a filing date');

/*
  And the dictionary must actually discriminate. A tone score that is the same
  for every release would pass the leak test perfectly and carry no information
  — the failure mode where the words never match and everything reads zero.
*/
const tones = releases.map((r) => tone(r.release));
const spread = Math.max(...tones) - Math.min(...tones);
const hedges = releases.map((r) => hedging(r.release));
console.log(`earnings: tone spans ${Math.min(...tones).toFixed(1)} to ${Math.max(...tones).toFixed(1)}, ` +
  `hedging ${Math.min(...hedges).toFixed(1)} to ${Math.max(...hedges).toFixed(1)}`);

if (spread < 1) {
  console.error('earnings: FAIL — tone barely varies; the dictionary is not matching');
  process.exit(1);
}
