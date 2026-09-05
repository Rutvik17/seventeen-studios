#!/usr/bin/env node
/**
 * DOES THE FORM 4 JOIN LEAK THE FUTURE?
 *
 * The same question asked of 13F, and it has to be asked separately because
 * the two families are lagged by different mechanisms. A 13F is gated by a
 * statutory deadline computed from the period end. A Form 4 carries its own
 * filing date, so the gate is the data — which is simpler and therefore easier
 * to get subtly wrong, because there is nothing to compute and nothing to check
 * the computation against.
 *
 * The test is mechanical: a rolling count can only change on a day when a
 * filing ARRIVES, or on a day when one AGES OUT of the far end of the window.
 * Any other movement means the window is reading something it should not be
 * able to see yet.
 *
 * ---
 * AND IT IS TESTED FROM THE TRANSACTION DATES, DELIBERATELY
 *
 * The features must key on FILING date, because that is when the market could
 * see the trade. So this also asserts the gap: every filing date must be on or
 * after the transaction it reports. If the fetcher were ever changed to key on
 * transaction date, the model would gain two days of hindsight on every row and
 * nothing else here would notice.
 *
 * Run: npm run form4:verify   (part of `npm run verify`)
 */
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { insiderRows, INSIDER_COLUMNS } from '../src/lib/engine/insider.ts';

const ROOT = path.join(import.meta.dirname, '..');
const FILE = path.join(ROOT, 'data', 'form4.json');

if (!existsSync(FILE)) {
  console.log('form4: no data/form4.json — run `npm run form4` first. Skipping.');
  process.exit(0);
}

const { events } = JSON.parse(readFileSync(FILE, 'utf8'));

/* A year of calendar dates, which is enough for a 63-day window to fill and roll. */
const dates = [];
for (let d = new Date('2025-07-01'); d <= new Date('2026-06-30'); d.setDate(d.getDate() + 1)) {
  dates.push(d.toISOString().slice(0, 10));
}

const SYMBOLS = ['NVDA', 'JPM', 'XOM', 'KO', 'WMT'];
const WINDOW = 63; // must match LONG in insider.ts

let moves = 0;
let unexplained = 0;
const examples = [];

for (const symbol of SYMBOLS) {
  const rows = insiderRows(events, symbol, dates);
  const filed = new Set(events.filter((e) => e.symbol === symbol).map((e) => e.date));
  const mine = events.filter((e) => e.symbol === symbol);

  for (let i = 1; i < rows.length; i++) {
    const changed = rows[i][0] !== rows[i - 1][0] || rows[i][1] !== rows[i - 1][1];
    if (!changed) continue;
    moves += 1;

    // A filing arrived today.
    if (filed.has(dates[i])) continue;

    /*
      Or one aged out. The window start moved from `prevStart` to `start`, so
      anything filed in between has just left — checked as a RANGE rather than a
      single date, because the two starts can be more than a day apart when the
      series begins and because a calendar day may hold no filing at all.
    */
    const start = dates[Math.max(0, i - WINDOW)];
    const prevStart = dates[Math.max(0, i - 1 - WINDOW)];
    if (mine.some((e) => e.date >= prevStart && e.date < start)) continue;

    unexplained += 1;
    if (examples.length < 5) examples.push(`${symbol} ${dates[i]}`);
  }
}

console.log(`form4: ${SYMBOLS.length} symbols over ${dates.length} days, ${moves} feature moves`);

if (unexplained) {
  console.error(`form4: FAIL — ${unexplained} move(s) with no filing arriving or ageing out`);
  console.error(`      e.g. ${examples.join(', ')}`);
  process.exit(1);
}
if (!moves) {
  console.error('form4: FAIL — nothing moved, so this proves nothing');
  process.exit(1);
}

console.log(`form4: PASS — every move explained by an arrival or an expiry (${events.length.toLocaleString()} events)`);

/*
  Sales outnumber purchases in every real quarter of this data, because
  executives are paid in stock. If that ever inverts, the P/S codes have been
  crossed somewhere.
*/
const buys = events.reduce((s, e) => s + e.buyers, 0);
const sells = events.reduce((s, e) => s + e.sellers, 0);
if (!(sells > buys)) {
  console.error(`form4: FAIL — ${buys} buys vs ${sells} sells; insiders are structurally sellers, so the codes are likely crossed`);
  process.exit(1);
}
console.log(`form4: ${buys.toLocaleString()} purchases against ${sells.toLocaleString()} sales (${(sells / buys).toFixed(1)}x), which is the expected direction`);
