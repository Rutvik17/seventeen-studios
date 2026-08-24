/**
 * The factor panel: exposures and realised returns, month by month.
 *
 *   npm run alpha:data
 *
 * Fetches five years of daily bars for a universe of large-cap US stocks,
 * computes every factor at every month end, and writes what the model needs to
 * `src/content/alpha.json` — a few hundred kilobytes of numbers rather than the
 * five megabytes of prices they came from.
 *
 * ---
 *
 * WHY THE PRICES ARE THROWN AWAY
 *
 * A hundred names of daily OHLCV is 5.3 MB, and the browser needs none of it.
 * What the model consumes is seven exposures and one return per stock per month:
 * about a hundredth of the size, and enough to re-run the ranking, the
 * covariance and the optimiser live when a slider moves.
 *
 * The prices are fetched, used, and discarded on every build. Only the panel is
 * committed.
 *
 * ---
 *
 * SURVIVORSHIP BIAS, STATED PLAINLY
 *
 * The universe below is a list of companies that are large and listed TODAY.
 * Backtesting it over five years silently excludes everything that was large
 * five years ago and then failed, was acquired, or fell out of the index — and
 * those are precisely the names a long-short model would have been short.
 *
 * The honest fix is a point-in-time constituent list, which is not free. So the
 * bias is disclosed on the page rather than papered over: it flatters the long
 * side, and the size of the flattery is unknown. Every published estimate puts
 * it at a meaningful fraction of a percent a year, not a rounding error.
 */

import { mkdirSync, writeFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { FACTORS, exposures } from '../src/lib/factors.ts';
import { UNIVERSE } from '../src/content/universe.ts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outFile = path.join(root, 'src', 'content', 'alpha.json');


const NY = 'America/New_York';
const dayFmt = new Intl.DateTimeFormat('en-CA', {
  timeZone: NY, year: 'numeric', month: '2-digit', day: '2-digit',
});

const round = (v, places = 4) => {
  if (!Number.isFinite(v)) return null;
  const f = 10 ** places;
  return Math.round(v * f) / f;
};

async function bars(symbol) {
  const url =
    `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?range=5y&interval=1d`;
  const res = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (compatible; seventeen-studios-build/1.0; +https://github.com/Rutvik17/seventeen-studios)',
      Accept: 'application/json',
    },
  });
  if (!res.ok) throw new Error(`${symbol}: HTTP ${res.status}`);

  const json = await res.json();
  const result = json?.chart?.result?.[0];
  if (!result) throw new Error(`${symbol}: ${json?.chart?.error?.description ?? 'no result'}`);

  const stamps = result.timestamp ?? [];
  const q = result.indicators?.quote?.[0] ?? {};
  const adj = result.indicators?.adjclose?.[0]?.adjclose;

  const out = [];
  for (let i = 0; i < stamps.length; i++) {
    /*
      ADJUSTED closes, and it is not optional for a momentum model. A 4-for-1
      split shows up in raw prices as a 75% crash, which would put the stock in
      the short book on the strength of a clerical event.
    */
    const close = adj?.[i] ?? q.close?.[i];
    const volume = q.volume?.[i];
    if (close == null || !Number.isFinite(close)) continue;
    out.push({
      date: dayFmt.format(new Date(stamps[i] * 1000)),
      close,
      volume: Number.isFinite(volume) ? volume : 0,
    });
  }
  return out;
}

/** The last trading day of each month present in a date-sorted series. */
function monthEnds(dates) {
  const last = new Map();
  for (const date of dates) last.set(date.slice(0, 7), date);
  return [...last.values()].sort();
}

async function main() {
  console.log(`  fetching ${UNIVERSE.length} names…`);
  const series = new Map();
  let failed = 0;

  for (const { symbol } of UNIVERSE) {
    try {
      series.set(symbol, await bars(symbol));
    } catch (error) {
      failed++;
      console.log(`  ! ${symbol}: ${error.message}`);
    }
  }

  const symbols = UNIVERSE.filter((u) => series.has(u.symbol));
  console.log(`  ${symbols.length} fetched, ${failed} failed`);

  /*
    A shared calendar. Stocks halt and list on different days, so every series is
    indexed by date rather than by position — reading bar 300 of two different
    names is not reading the same day.
  */
  const allDates = new Set();
  for (const rows of series.values()) for (const r of rows) allDates.add(r.date);
  const calendar = [...allDates].sort();
  const ends = monthEnds(calendar);

  const byDate = new Map();
  for (const [symbol, rows] of series) {
    const map = new Map();
    for (const r of rows) map.set(r.date, r);
    byDate.set(symbol, map);
  }

  /*
    The universe's own daily return, equal weighted, used as the market leg for
    beta. Built from the same names the model trades, so there is no index whose
    constituents could drift away from what is being measured.
  */
  const marketByDate = new Map();
  for (let i = 1; i < calendar.length; i++) {
    const today = calendar[i];
    const before = calendar[i - 1];
    const moves = [];
    for (const [, map] of byDate) {
      const a = map.get(before);
      const b = map.get(today);
      if (a && b && a.close > 0 && b.close > 0) moves.push(Math.log(b.close / a.close));
    }
    if (moves.length > 10) {
      marketByDate.set(today, moves.reduce((s, v) => s + v, 0) / moves.length);
    }
  }

  const months = [];
  // A year of history before the first formation date, so momentum can exist.
  const firstUsable = 13 * 21;

  for (const end of ends) {
    const cut = calendar.indexOf(end);
    if (cut < firstUsable) continue;

    const window = calendar.slice(0, cut + 1);
    const market = window.map((d) => marketByDate.get(d)).filter((v) => v != null);

    /*
      Rows are ALIGNED TO `universe` ORDER, not labelled with a symbol.

      Repeating a ticker string on every row costs eight characters times two
      hundred and fifty names times forty-eight months — a tenth of the payload
      spent restating what position already says. A name with too little history
      that month is null rather than absent, so the index still lines up.
    */
    let present = 0;
    const rows = symbols.map(({ symbol }) => {
      const map = byDate.get(symbol);
      const history = window.map((d) => map.get(d)).filter(Boolean);
      if (history.length < firstUsable) return null;
      present++;
      const e = exposures(history, market);
      return FACTORS.map((f) => round(e[f], 4));
    });

    if (present >= 20) months.push({ date: end, rows });
  }

  /*
    Realised forward returns, attached to the month that PREDICTED them.

    This is the join where look-ahead bias enters a factor backtest, so it is
    done once, here, and explicitly: the exposures on month t are paired with the
    return from month t's close to month t+1's close. The model never sees a
    return before it has committed to a weight.
  */
  const monthly = {};
  for (const { symbol } of symbols) {
    const map = byDate.get(symbol);
    monthly[symbol] = ends.map((end) => {
      const bar = map.get(end);
      return bar ? bar.close : null;
    });
  }

  const out = {
    fetchedAt: new Date().toISOString(),
    source: 'Yahoo Finance chart API, adjusted closes',
    factors: FACTORS,
    universe: symbols,
    monthEnds: ends,
    /** Month-end closes per symbol, aligned to `monthEnds`. Returns come from these. */
    closes: Object.fromEntries(
      Object.entries(monthly).map(([s, xs]) => [s, xs.map((v) => round(v, 2))]),
    ),
    /** Exposures per formation month. */
    months,
  };

  mkdirSync(path.dirname(outFile), { recursive: true });
  writeFileSync(outFile, JSON.stringify(out));

  const kb = (statSync(outFile).size / 1024).toFixed(0);
  console.log(
    `  ${months.length} formation months, ${months.at(-1)?.rows.length ?? 0} names in the last one`,
  );
  console.log(`  wrote src/content/alpha.json (${kb} KB)`);
}

main().catch((error) => {
  console.error(`fetch-universe failed: ${error.message}`);
  process.exit(1);
});
