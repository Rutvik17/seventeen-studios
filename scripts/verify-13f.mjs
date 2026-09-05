#!/usr/bin/env node
/**
 * DOES THE 13F JOIN LEAK THE FUTURE?
 *
 * The one question that matters about this family. Ownership data is quarterly
 * and arrives late, so the join has more places to go wrong than a price
 * feature does — and a leak here would look exactly like skill.
 *
 * The test is mechanical rather than a matter of reading the code: walk a
 * symbol's daily feature series and find every date the value MOVES. Each of
 * those must land on a statutory availability date, because that is the only
 * day new information legally exists. A value that changes on any other day is
 * reading a filing before it was filed.
 *
 * Run: npm run 13f:verify   (part of `npm run verify`)
 */
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { institutionalRows, available13f, INSTITUTIONAL_COLUMNS } from '../src/lib/engine/institutional.ts';

const ROOT = path.join(import.meta.dirname, '..');
const FILE = path.join(ROOT, 'data', '13f.json');

if (!existsSync(FILE)) {
  console.log('13f: no data/13f.json — run `npm run 13f` first. Skipping.');
  process.exit(0);
}

const j = JSON.parse(readFileSync(FILE, 'utf8'));
const quarters = j.quarters.filter(q => q.period >= '2013-01-01' && q.period <= '2026-12-31');

// A year of daily dates around a known quarter boundary.
const dates = [];
for (let d = new Date('2026-01-01'); d <= new Date('2026-06-30'); d.setDate(d.getDate()+1)) {
  dates.push(d.toISOString().slice(0,10));
}

/*
  Several symbols and every column, because one name on one feature could pass
  by luck — a name whose ownership happened not to move would show no changes
  at all and read as a pass.
*/
const SYMBOLS = ['NVDA', 'AAPL', 'JPM', 'XOM', 'KO'];
const changes = [];
for (const symbol of SYMBOLS) {
  const rows = institutionalRows(quarters, symbol, dates);
  for (let c = 0; c < INSTITUTIONAL_COLUMNS.length; c++) {
    for (let i = 1; i < rows.length; i++) {
      const a = rows[i - 1][c];
      const b = rows[i][c];
      if (Number.isFinite(a) !== Number.isFinite(b)
        || (Number.isFinite(a) && Math.abs(a - b) > 1e-12)) {
        changes.push(dates[i]);
      }
    }
  }
}
console.log(`13f: ${SYMBOLS.length} symbols x ${INSTITUTIONAL_COLUMNS.length} columns over ${dates.length} days`);
console.log('13f: values changed on', [...new Set(changes)].sort().join(', ') || 'never');

/*
  THE EXPECTATION IS COMPUTED HERE, NOT IMPORTED.

  The first version of this test compared the change dates against
  `available13f()` — the same function it was meant to be testing. Setting the
  lag to zero made the features leak by 45 days and the test still passed,
  because both sides moved together. A check that cannot fail is not a check.

  So the deadline is restated independently: 45 days after the period end, from
  17 CFR 240.13f-1. If the library's rule ever drifts from the statute, these
  two disagree and the test says so.
*/
const STATUTORY_DAYS = 45;
const deadline = (period) => {
  const d = new Date(`${period}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + STATUTORY_DAYS);
  return d.toISOString().slice(0, 10);
};
const legal = new Set(quarters.map(q => deadline(q.period)));
const early = changes.filter(d => !legal.has(d));
console.log('changes NOT on a statutory availability date:', early.length ? early.join(', ') : 'none');

/* And the library must agree with the statute on every period, not just where
   a value happened to move. */
const drifted = quarters.filter(q => available13f(q.period) !== deadline(q.period));
if (drifted.length) {
  console.error(`13f: FAIL — available13f() disagrees with the ${STATUTORY_DAYS}-day statute on ${drifted.length} period(s)`);
  console.error(`      e.g. ${drifted[0].period}: library says ${available13f(drifted[0].period)}, statute says ${deadline(drifted[0].period)}`);
  process.exit(1);
}

if (early.length) {
  console.error('13f: FAIL — a feature moved before its quarter was filable');
  process.exit(1);
}
if (!changes.length) {
  console.error('13f: FAIL — the feature never moved, so this proves nothing');
  process.exit(1);
}
console.log(`13f: PASS — ${changes.length} changes, every one on a statutory availability date`);
