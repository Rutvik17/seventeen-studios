/**
 * The factor panel: exposures and realised returns, month by month.
 *
 *   npm run alpha:data
 *
 * Fetches the current S&P 500 constituents, five years of daily bars for each,
 * computes every factor at every month end, and writes what the model needs to
 * `public/data/alpha.json` — a couple of megabytes of numbers rather than the
 * ten megabytes of prices they came from.
 *
 * ---
 *
 * WHY THE UNIVERSE IS FETCHED RATHER THAN WRITTEN DOWN
 *
 * It used to be a hand-typed list of 256 names grouped into 45 industries I
 * chose. That is an undisclosed active bet sitting underneath every number the
 * model produces: some of the return is factor alpha and some of it is that I
 * typed NVDA and did not type a retailer that later died, and nothing in the
 * backtest separates those two.
 *
 * A universe defined by somebody else removes the author from the selection,
 * which is the only thing that makes the comparison against SPY honest. It also
 * stops being wrong the moment the index changes.
 *
 * ---
 *
 * SURVIVORSHIP BIAS, STATED PLAINLY AND STILL UNFIXED
 *
 * These are the companies in the index TODAY. Backtesting them over five years
 * silently excludes everything that was in the index five years ago and then
 * failed, was acquired, or was dropped.
 *
 * The fix would be point-in-time membership, and membership alone is free —
 * Wikipedia carries dated additions and removals. Prices for the departed are
 * not: SIVB, FRC, ATVI, XLNX, TWTR, CERN, ANSS and NLOK were all tested against
 * the Yahoo chart API and all eight return 404. Yahoo purges delisted symbols
 * outright.
 *
 * Reconstructing membership without those prices would be WORSE than this. It
 * would look rigorous while still dropping every failure, because the failures
 * are exactly the rows that cannot be filled. So the bias stays, disclosed, and
 * it flatters the long side by an unknown amount.
 *
 * ---
 *
 * WHY THE PRICES ARE THROWN AWAY
 *
 * Five hundred names of daily OHLCV is about 10 MB and the browser needs none of
 * it. What the model consumes is seven exposures and one return per stock per
 * month. The prices are fetched, used, and discarded on every build; only the
 * panel is committed.
 */

import { mkdirSync, writeFileSync, statSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { FACTORS, exposures } from '../src/lib/factors.ts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outFile = path.join(root, 'public', 'data', 'alpha.json');

/*
  The constituent list, as a plain CSV maintained by a bot.

  Wikipedia is the usual source and it was tested first: the rendered HTML table
  parsed ZERO rows, which is exactly the fragility you do not want in a build
  that runs unattended every weekday. This is a CSV with a stable header and no
  markup to break.
*/
const CONSTITUENTS =
  'https://raw.githubusercontent.com/datasets/s-and-p-500-companies/main/data/constituents.csv';

/*
  How fine the industry buckets are allowed to get.

  The factors are neutralised WITHIN these buckets, so the granularity decides
  what the model is allowed to bet on. Rank a semiconductor against a utility on
  twelve-month momentum and most of what the ranking measures is that
  semiconductors ran and utilities did not — a sector call wearing a
  stock-selection costume, already available for nothing in a sector ETF.

  But a bucket needs a population to demean against, and GICS sub-industries are
  far too fine for that: 127 groups over 503 names, median 3 names each, 72% of
  them below five. A z-score inside a group of three is not neutralising
  anything, it is ranking three stocks and calling it a factor.

  So: keep the sub-industry where it can support itself, otherwise fall back to
  the parent sector. Measured across thresholds, eight is the knee —

      N    groups   median   under-8   kept at sub-industry
      4       61        6        34          70%
      8       29       13         1          39%
     20       11       34         0           0%   (pure sector)

  29 groups at a median of 13 keeps Semiconductors, Application Software and
  Aerospace & Defense as their own populations while leaving exactly one thin
  bucket. The old hand-made scheme was 45 groups of about six, which had the
  sub-industry problem without anybody noticing.
*/
const MIN_BUCKET = 8;

/** How many price requests are in flight at once. Politeness, not throughput. */
const CONCURRENCY = 6;

const NY = 'America/New_York';
const dayFmt = new Intl.DateTimeFormat('en-CA', {
  timeZone: NY, year: 'numeric', month: '2-digit', day: '2-digit',
});

const round = (v, places = 4) => {
  if (!Number.isFinite(v)) return null;
  const f = 10 ** places;
  return Math.round(v * f) / f;
};

const AGENT =
  'Mozilla/5.0 (compatible; seventeen-studios-build/1.0; +https://github.com/Rutvik17/seventeen-studios)';

/** RFC 4180 enough: quoted fields carry commas ("Saint Paul, Minnesota"). */
function parseCSV(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; } else quoted = false;
      } else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
    else if (c !== '\r') field += c;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  return rows;
}

async function constituents() {
  const res = await fetch(CONSTITUENTS, { headers: { 'User-Agent': AGENT } });
  if (!res.ok) throw new Error(`constituents: HTTP ${res.status}`);

  const [header, ...rows] = parseCSV(await res.text());
  const col = (name) => {
    const i = header.indexOf(name);
    if (i < 0) throw new Error(`constituents: no "${name}" column — the schema moved`);
    return i;
  };
  const iSymbol = col('Symbol');
  const iName = col('Security');
  const iSector = col('GICS Sector');
  const iSub = col('GICS Sub-Industry');

  const listed = rows
    .filter((r) => r[iSymbol])
    .map((r) => ({
      /*
        Yahoo spells share classes with a hyphen where the index uses a dot:
        BRK.B is BRK-B, BF.B is BF-B. Four names, and getting it wrong drops
        them silently as failed fetches rather than loudly as an error.
      */
      symbol: r[iSymbol].trim().replace(/\./g, '-'),
      name: r[iName].trim(),
      sector: r[iSector].trim(),
      sub: r[iSub].trim(),
    }));

  if (listed.length < 400) {
    throw new Error(`constituents: only ${listed.length} rows — the source is wrong`);
  }

  const perSub = {};
  for (const c of listed) perSub[c.sub] = (perSub[c.sub] ?? 0) + 1;

  return listed.map((c) => ({
    symbol: c.symbol,
    name: c.name,
    industry: perSub[c.sub] >= MIN_BUCKET ? c.sub : c.sector,
  }));
}

async function bars(symbol) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?range=5y&interval=1d`;
  const res = await fetch(url, {
    headers: { 'User-Agent': AGENT, Accept: 'application/json' },
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

/** Runs `worker` over `items`, at most `limit` at a time. */
async function pool(items, limit, worker) {
  let next = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      await worker(items[i], i);
    }
  });
  await Promise.all(runners);
}

async function main() {
  const universe = await constituents();
  const buckets = new Set(universe.map((u) => u.industry));
  console.log(`  ${universe.length} constituents, ${buckets.size} industry buckets`);

  const series = new Map();
  const failures = [];
  let done = 0;

  await pool(universe, CONCURRENCY, async ({ symbol }) => {
    try {
      series.set(symbol, await bars(symbol));
    } catch (error) {
      failures.push(error.message);
    }
    if (++done % 100 === 0) console.log(`  …${done}/${universe.length}`);
  });

  const symbols = universe.filter((u) => series.has(u.symbol));
  console.log(`  ${symbols.length} fetched, ${failures.length} failed`);
  for (const f of failures.slice(0, 10)) console.log(`  ! ${f}`);

  /*
    A universe that has quietly halved is not a smaller universe, it is a broken
    fetch — a Yahoo rate limit or a schema change returns HTTP errors for most
    names and the model would go on ranking whatever survived.
  */
  if (symbols.length < universe.length * 0.9) {
    throw new Error(`only ${symbols.length} of ${universe.length} names fetched`);
  }

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

      Repeating a ticker string on every row costs eight characters times five
      hundred names times forty-eight months — a tenth of the payload spent
      restating what position already says. A name with too little history that
      month is null rather than absent, so the index still lines up.
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
    source: 'Yahoo Finance chart API, adjusted closes; S&P 500 constituents via datasets/s-and-p-500-companies',
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
  console.log(`  wrote public/data/alpha.json (${kb} KB)`);
}

/*
  A FAILED REFRESH MUST NOT COST A DEPLOY — but it must not be silent either.

  This runs in `prebuild`, so throwing here takes the whole site down with it.
  Five hundred requests from a shared GitHub runner IP is exactly the shape of
  traffic Yahoo rate-limits, and a published site is worth more than a panel
  that is one day fresher.

  So: if a usable panel is already committed, keep it and warn loudly. The
  `::warning::` prefix surfaces it in the Actions summary rather than burying it
  in the log, because the failure mode this project has already hit once is a
  data step that quietly no-ops forever while everything looks green.

  If there is NO committed panel, there is nothing to fall back to and the build
  should fail rather than ship a site with no model behind it.
*/
main().catch((error) => {
  console.error(`fetch-universe failed: ${error.message}`);

  if (existsSync(outFile)) {
    const age = Math.round((Date.now() - statSync(outFile).mtimeMs) / 86_400_000);
    console.error(`::warning::alpha panel not refreshed (${error.message}); keeping the committed one, last written ${age}d ago`);
    process.exit(0);
  }

  console.error('no committed panel to fall back to');
  process.exit(1);
});
