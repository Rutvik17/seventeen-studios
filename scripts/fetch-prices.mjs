/**
 * Sixteen years of daily bars for the S&P 500, plus SPY itself.
 *
 *   npm run data:prices
 *
 * Writes `data/prices.json` — gitignored, roughly 85 MB, and never committed.
 * The repository stores computed features and backtest results; the prices they
 * came from are re-fetched whenever they are needed.
 *
 * ---
 *
 * WHY period1/period2 AND NOT range=max
 *
 * `range=max&interval=1d` looks like it asks for every daily bar ever. It does
 * not: Yahoo silently coarsens the interval on long ranges and returns MONTHLY
 * data. Measured — SPY over `range=max` came back with 404 bars covering 1993 to
 * 2026, which is one bar a month, while the same window with explicit unix
 * timestamps returns 4,207 daily bars.
 *
 * Nothing in the response says the interval was changed. A model trained on that
 * would have been trained on monthly data believing it was daily.
 *
 * ---
 *
 * WHY SPY IS FETCHED WITH THE REST
 *
 * It is the benchmark and it is also a feature: the market's own trend and
 * volatility are what the regime model reads. It has to sit on exactly the same
 * calendar as the names, so it is fetched the same way at the same time rather
 * than reconciled later.
 */

import { mkdirSync, writeFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outFile = path.join(root, 'data', 'prices.json');

/** Everything from here forward. XBRL coverage thins out before ~2009. */
const START = '2009-12-01';

const CONSTITUENTS =
  'https://raw.githubusercontent.com/datasets/s-and-p-500-companies/main/data/constituents.csv';

const BENCHMARK = 'SPY';

/** Requests in flight at once. Politeness to Yahoo, not throughput. */
const CONCURRENCY = 6;

const AGENT =
  'Mozilla/5.0 (compatible; seventeen-studios-build/1.0; +https://github.com/Rutvik17/seventeen-studios)';

const NY = 'America/New_York';
const dayFmt = new Intl.DateTimeFormat('en-CA', {
  timeZone: NY, year: 'numeric', month: '2-digit', day: '2-digit',
});

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

/*
  Sub-industry where it can support a population, sector otherwise.

  GICS sub-industries are 127 groups over 503 names — median 3 each, 72% below
  five — which is far too fine to demean a factor against. The eleven sectors are
  coarse enough that a semiconductor gets ranked against a utility. Keeping a
  sub-industry only where it has eight names gives 29 buckets at a median of 13.
  Measured across thresholds from 4 to 20, eight is the knee.
*/
const MIN_BUCKET = 8;

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
  const iCik = col('CIK');

  const listed = rows.filter((r) => r[iSymbol]).map((r) => ({
    // Yahoo spells share classes with a hyphen where the index uses a dot:
    // BRK.B is BRK-B. Getting it wrong drops those names as silent fetch
    // failures rather than as a loud error.
    symbol: r[iSymbol].trim().replace(/\./g, '-'),
    name: r[iName].trim(),
    sector: r[iSector].trim(),
    sub: r[iSub].trim(),
    // The SEC identifier, which is what every fundamentals and filings lookup
    // is keyed on. It arrives free in this file, so there is no second source
    // to reconcile against.
    cik: String(r[iCik]).trim().padStart(10, '0'),
  }));

  if (listed.length < 400) {
    throw new Error(`constituents: only ${listed.length} rows — the source is wrong`);
  }

  const perSub = {};
  for (const c of listed) perSub[c.sub] = (perSub[c.sub] ?? 0) + 1;

  return listed.map((c) => ({
    symbol: c.symbol,
    name: c.name,
    cik: c.cik,
    sector: c.sector,
    industry: perSub[c.sub] >= MIN_BUCKET ? c.sub : c.sector,
  }));
}

async function bars(symbol, period1, period2) {
  const url =
    `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}` +
    `?period1=${period1}&period2=${period2}&interval=1d`;
  const res = await fetch(url, { headers: { 'User-Agent': AGENT, Accept: 'application/json' } });
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
      ADJUSTED close, and it is not optional. A 4-for-1 split shows up in raw
      prices as a 75% crash, which a momentum feature reads as a collapse and a
      trading model acts on.

      Open, high and low are NOT adjusted by Yahoo, so they are scaled by the
      same ratio the close was adjusted by. Without that, a true range computed
      from a raw high and an adjusted close is nonsense on any day after a split.
    */
    const close = q.close?.[i];
    const adjClose = adj?.[i] ?? close;
    if (close == null || adjClose == null || !Number.isFinite(adjClose) || close <= 0) continue;

    const k = adjClose / close;
    const open = q.open?.[i];
    const high = q.high?.[i];
    const low = q.low?.[i];
    const volume = q.volume?.[i];

    out.push({
      d: dayFmt.format(new Date(stamps[i] * 1000)),
      o: Number.isFinite(open) ? +(open * k).toFixed(4) : null,
      h: Number.isFinite(high) ? +(high * k).toFixed(4) : null,
      l: Number.isFinite(low) ? +(low * k).toFixed(4) : null,
      c: +adjClose.toFixed(4),
      v: Number.isFinite(volume) ? volume : 0,
      /*
        DOLLAR VOLUME FROM THE UNADJUSTED CLOSE, AND THIS IS A LOOK-AHEAD FIX.

        The obvious computation is adjusted close x volume, and it leaks. Yahoo's
        adjusted close divides out every dividend paid between that day and
        TODAY, so the adjustment factor is a summary of the future. Using it to
        value a 2013 day makes high-future-dividend names look systematically
        less liquid in 2013 — and "will pay a lot of dividends over the next
        thirteen years" is a real characteristic correlated with returns.

        Measured on 2013-01-02: k is 0.92 for NVDA, 0.84 for AAPL, 0.70 for JPM
        and 0.58 for XOM, so dollar volume was understated by 1.1x to 1.7x in a
        pattern that tracks future dividend policy. Illiquidity was the model's
        fourth most important feature at 11.4%, so this was not academic.

        `q.close` is already split-adjusted by Yahoo but NOT dividend-adjusted,
        which is exactly what dollar volume wants: the actual money that changed
        hands, in share terms comparable across the series.
      */
      dv: Number.isFinite(volume) ? Math.round(close * volume) : 0,
    });
  }
  return out;
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
  const period1 = Math.floor(new Date(START).getTime() / 1000);
  const period2 = Math.floor(Date.now() / 1000);

  const universe = await constituents();
  console.log(`  ${universe.length} constituents, ${new Set(universe.map((u) => u.industry)).size} industry buckets`);

  const series = {};
  const failures = [];
  let done = 0;

  const targets = [{ symbol: BENCHMARK }, ...universe];
  await pool(targets, CONCURRENCY, async ({ symbol }) => {
    try {
      series[symbol] = await bars(symbol, period1, period2);
    } catch (error) {
      failures.push(error.message);
    }
    if (++done % 100 === 0) console.log(`  …${done}/${targets.length}`);
  });

  if (!series[BENCHMARK]?.length) {
    throw new Error(`${BENCHMARK} did not fetch — there is no benchmark to score against`);
  }

  const fetched = universe.filter((u) => series[u.symbol]?.length);
  console.log(`  ${fetched.length} of ${universe.length} fetched, ${failures.length} failed`);
  for (const f of failures.slice(0, 8)) console.log(`  ! ${f}`);

  /*
    A universe that has quietly halved is a broken fetch, not a smaller universe.
    A Yahoo rate limit returns errors for most names at once and the model would
    go on trading whatever survived without anything looking wrong.
  */
  if (fetched.length < universe.length * 0.9) {
    throw new Error(`only ${fetched.length} of ${universe.length} names fetched`);
  }

  const out = {
    fetchedAt: new Date().toISOString(),
    start: START,
    benchmark: BENCHMARK,
    source: 'Yahoo Finance chart API, split/dividend adjusted; constituents via datasets/s-and-p-500-companies',
    universe: fetched,
    bars: series,
  };

  mkdirSync(path.dirname(outFile), { recursive: true });
  writeFileSync(outFile, JSON.stringify(out));

  const spy = series[BENCHMARK];
  const total = Object.values(series).reduce((s, b) => s + b.length, 0);
  console.log(`  ${BENCHMARK}: ${spy.length} bars, ${spy[0].d} .. ${spy.at(-1).d}`);
  console.log(`  ${total.toLocaleString()} bars total`);
  console.log(`  wrote data/prices.json (${(statSync(outFile).size / 1024 / 1024).toFixed(1)} MB, gitignored)`);
}

main().catch((error) => {
  console.error(`fetch-prices failed: ${error.message}`);
  process.exit(1);
});
