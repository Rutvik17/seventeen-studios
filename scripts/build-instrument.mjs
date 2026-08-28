#!/usr/bin/env node
/**
 * Turn the backtest into something a browser can hold.
 *
 * ---
 *
 * WHY THIS EXISTS
 *
 * `data/backtest.json` is half a megabyte and `data/tape.json` is thirty-eight.
 * Neither ships: the site is a static export and the whole point of the tape is
 * that it stays on the machine that produced it.
 *
 * So this reduces the run to the smallest thing that can still be argued with —
 * a curve you can look at, the exact metrics, the year-by-year, and the
 * exposure the book actually carried. Everything here is DERIVED FROM THE DAILY
 * SERIES even where the chart is drawn weekly, because a maximum drawdown taken
 * off a weekly sample is not the maximum drawdown.
 *
 * Run: npm run instrument
 */
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.join(import.meta.dirname, '..');
const IN = path.join(ROOT, 'data', 'backtest.json');
const OUT = path.join(ROOT, 'public', 'data', 'engine.json');

const bt = JSON.parse(readFileSync(IN, 'utf8'));
const { dates, curve, spyCurve, metrics, journal } = bt;

const r4 = (v) => Math.round(v * 1e4) / 1e4;

/*
  Weekly for DRAWING only. 3,431 points is more than any chart can resolve and
  five times the bytes; every number quoted anywhere on the page comes from the
  daily series below, never from this.
*/
const STRIDE = 5;
const sampled = { dates: [], curve: [], spy: [] };
for (let i = 0; i < dates.length; i += STRIDE) {
  sampled.dates.push(dates[i]);
  sampled.curve.push(r4(curve[i]));
  sampled.spy.push(r4(spyCurve[i]));
}
// Always end on the real last point, or the chart stops short of the result.
const last = dates.length - 1;
if (sampled.dates[sampled.dates.length - 1] !== dates[last]) {
  sampled.dates.push(dates[last]);
  sampled.curve.push(r4(curve[last]));
  sampled.spy.push(r4(spyCurve[last]));
}

/** Underwater series: how far below the running peak, daily, then sampled. */
function drawdown(series) {
  const out = [];
  let peak = -Infinity;
  for (const v of series) {
    peak = Math.max(peak, v);
    out.push((v - peak) / peak);
  }
  return out;
}
const ddStrategy = drawdown(curve);
const ddSpy = drawdown(spyCurve);
const sampledDd = { curve: [], spy: [] };
for (let i = 0; i < dates.length; i += STRIDE) {
  sampledDd.curve.push(r4(ddStrategy[i]));
  sampledDd.spy.push(r4(ddSpy[i]));
}
if (sampledDd.curve.length !== sampled.dates.length) {
  sampledDd.curve.push(r4(ddStrategy[last]));
  sampledDd.spy.push(r4(ddSpy[last]));
}

/** Calendar-year returns, from the daily curve. */
function years(series) {
  const byYear = new Map();
  for (let i = 0; i < dates.length; i++) {
    const y = dates[i].slice(0, 4);
    if (!byYear.has(y)) byYear.set(y, { first: i, last: i });
    else byYear.get(y).last = i;
  }
  const out = [];
  for (const [y, { first, last: end }] of byYear) {
    // Measured from the previous year's close where there is one, so a year is
    // not silently shortened by starting at its own first print.
    const base = first > 0 ? series[first - 1] : series[first];
    out.push([y, r4(series[end] / base - 1)]);
  }
  return out;
}
const yearsStrategy = years(curve);
const yearsSpy = years(spyCurve);
const byYear = yearsStrategy.map(([y, s], i) => ({
  year: y,
  strategy: s,
  spy: yearsSpy[i][1],
  excess: r4(s - yearsSpy[i][1]),
}));

/*
  The rebalance journal, thinned to what a reader can use: when the book
  changed, how much of it was on, and how much it had to trade to get there.
*/
const rebalances = journal.map((j) => ({
  date: j.date,
  exposure: r4(j.exposure),
  reason: j.reason,
  longs: j.longs,
  shorts: j.shorts,
  net: r4(j.net),
  turnover: r4(j.turnover),
}));

const payload = {
  generatedAt: new Date().toISOString(),
  backtestGeneratedAt: bt.generatedAt,
  start: bt.start,
  end: bt.end,
  /** The chart's resolution. Stated so nobody measures a drawdown off it. */
  sampleStride: STRIDE,
  tradingDays: dates.length,
  ...sampled,
  drawdown: sampledDd,
  metrics,
  byYear,
  rebalances,
  turnover: {
    mean: r4(rebalances.reduce((s, r) => s + r.turnover, 0) / rebalances.length),
    count: rebalances.length,
  },
};

writeFileSync(OUT, `${JSON.stringify(payload)}\n`);

const bytes = readFileSync(OUT).length;
const wins = byYear.filter((y) => y.excess > 0).length;
console.log(`instrument: ${sampled.dates.length} plotted points from ${dates.length} trading days`);
console.log(`instrument: ${byYear.length} years, ${wins} ahead of SPY, ${rebalances.length} rebalances`);
console.log(`instrument: wrote ${(bytes / 1024).toFixed(1)} KB to public/data/engine.json`);
