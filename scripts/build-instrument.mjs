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
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.join(import.meta.dirname, '..');
/*
  THE POINT-IN-TIME RUN IS THE ONE THAT SHIPS.

  The biased run is read too, but only to state what it claimed. Its curve is
  not drawn and its holdings are not listed: it is a book that could buy
  companies before they were in the index, and putting that on an account page
  would be showing a balance nobody could have had.

  The gap between the two is kept because it is the most useful number here —
  $156,646 against $73,933 is the cost of survivorship stated in the only unit
  that means anything to a reader.
*/
const IN = path.join(ROOT, 'data', 'backtest-pit.json');
const BIASED = path.join(ROOT, 'data', 'backtest.json');
const OUT = path.join(ROOT, 'public', 'data', 'engine.json');

const bt = JSON.parse(readFileSync(IN, 'utf8'));
const biased = existsSync(BIASED) ? JSON.parse(readFileSync(BIASED, 'utf8')) : null;
const { dates, curve, spyCurve, metrics, journal } = bt;

const r4 = (v) => Math.round(v * 1e4) / 1e4;

/*
  A stake, so the curve has a unit.

  "14.66x" is a ratio and reads as a claim; "$10,000 became $146,646" is a
  quantity and reads as a result. It is the same number — the curve is a growth
  multiple and this only ever multiplies it — but one of them a reader can feel
  and the other they have to convert.
*/
const STAKE = 10_000;
const money = (multiple) => Math.round(STAKE * multiple);

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
/** The multiple at each year's last close, so a value can be stamped on it. */
function yearEndMultiples(series) {
  const seen = new Map();
  for (let i = 0; i < dates.length; i++) seen.set(dates[i].slice(0, 4), series[i]);
  return seen;
}
const endStrategy = yearEndMultiples(curve);
const endSpy = yearEndMultiples(spyCurve);

const byYear = yearsStrategy.map(([y, s], i) => ({
  year: y,
  strategy: s,
  spy: yearsSpy[i][1],
  excess: r4(s - yearsSpy[i][1]),
  // Compounded, not summed: the value carried into the next year.
  value: money(endStrategy.get(y)),
  spyValue: money(endSpy.get(y)),
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

/*
  WHAT WAS ACTUALLY HELD.

  The journal answers how concentrated the book was; this answers in what,
  which is the question anybody actually asks of a strategy. Two views:

  CURRENT is the last rebalance in full, because a book you cannot see the
  whole of is a claim rather than a record.

  BY YEAR is the ten largest by AVERAGE weight across that year's rebalances,
  not by weight on any single day. A name that was 4% once and absent the rest
  of the year did not characterise the year, and picking the peak would let it
  claim that it did.
*/
const current = journal[journal.length - 1];
const currentBook = {
  date: current.date,
  exposure: r4(current.exposure),
  gross: r4(current.gross),
  net: r4(current.net),
  positions: current.positions.map(([symbol, weight]) => ({ symbol, weight: r4(weight) })),
};

const heldByYear = new Map();
for (const j of journal) {
  const y = j.date.slice(0, 4);
  if (!heldByYear.has(y)) heldByYear.set(y, { sums: new Map(), rebalances: 0 });
  const bucket = heldByYear.get(y);
  bucket.rebalances += 1;
  for (const [symbol, weight] of j.positions) {
    bucket.sums.set(symbol, (bucket.sums.get(symbol) ?? 0) + weight);
  }
}

const byYearHoldings = [...heldByYear.entries()].map(([year, { sums, rebalances: n }]) => {
  const ranked = [...sums.entries()]
    .map(([symbol, total]) => ({ symbol, weight: r4(total / n) }))
    .sort((a, b) => Math.abs(b.weight) - Math.abs(a.weight));
  return { year, distinct: sums.size, top: ranked.slice(0, 10) };
});

/** Every name the book ever touched, and how many years it appeared in. */
const appearances = new Map();
for (const { year, top } of byYearHoldings) {
  for (const { symbol } of top) {
    appearances.set(symbol, (appearances.get(symbol) ?? 0) + 1);
  }
}
const persistent = [...appearances.entries()]
  .filter(([, years]) => years >= 3)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 12)
  .map(([symbol, years]) => ({ symbol, years }));

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
  stake: STAKE,
  pointInTime: true,
  finalValue: money(curve[last]),
  finalSpyValue: money(spyCurve[last]),
  /** What the same construction claimed on the survivorship-biased universe. */
  biased: biased ? {
    finalValue: money(biased.curve[biased.curve.length - 1]),
    annual: r4(biased.metrics.strategy.annual),
    sharpe: r4(biased.metrics.strategy.sharpe),
  } : null,
  byYear,
  rebalances,
  currentBook,
  byYearHoldings,
  persistent,
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
console.log(`instrument: point-in-time, $${STAKE.toLocaleString()} became $${money(curve[last]).toLocaleString()} (SPY $${money(spyCurve[last]).toLocaleString()})`);
if (biased) console.log(`instrument: the biased universe claimed $${money(biased.curve[biased.curve.length - 1]).toLocaleString()}`);
console.log(`instrument: current book ${currentBook.positions.length} names, ${persistent.length} held in 3+ years`);
console.log(`instrument: wrote ${(bytes / 1024).toFixed(1)} KB to public/data/engine.json`);
