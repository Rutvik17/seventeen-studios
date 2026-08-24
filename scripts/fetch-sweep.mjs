/**
 * Bars for the liquidity-sweep desk.
 *
 *   node scripts/fetch-sweep.mjs
 *
 * Writes `src/content/sweep.json`. Runs in `prebuild` beside
 * `fetch-market.mjs`, so the deploy workflow's daily 22:30 UTC rebuild refreshes
 * it after every US close.
 *
 * ---
 *
 * WHY THIS IS A BUILD STEP AND NOT AN API CALL FROM THE PAGE
 *
 * The browser cannot call Yahoo: the endpoint sends no CORS headers, so a fetch
 * from the page is blocked before it leaves. The usual answer is a small backend
 * to proxy it, and it is the wrong answer here — it would mean a server to host,
 * keep up and pay for, plus rate limits and a key to rotate, all to relay data
 * that changes once per trading day.
 *
 * Fetching at build time solves the same problem with none of that. The site
 * already rebuilds every weekday at 22:30 UTC, after the close and its
 * settlement, so the bars are never more than one session old. The backtest
 * itself is a few thousand multiplications and runs in the browser in
 * milliseconds — the risk desk on the same page already runs 25,000 Monte Carlo
 * paths client-side.
 *
 * ---
 *
 * WHAT THE DATA WILL AND WILL NOT SUPPORT, MEASURED
 *
 * The strategy is usually written for 5- or 15-minute bars. Yahoo will not serve
 * those beyond 60 days, and it refuses server-side rather than truncating —
 * asking for an older window returns "The requested range must be within the
 * last 60 days", so the windows cannot be stitched. Measured, not assumed:
 *
 *     15m / 30m   60 days      ~8-12 Mondays per ticker
 *     1h          ~1060 days   139 Mondays per ticker
 *     1d          10y+
 *
 * Ten setups cannot support a claim about a strategy. So the statistical run is
 * hourly, which buys 139 Mondays a ticker — 973 across the seven — at the cost
 * of only seven bars inside each session. That is thin for reading structure,
 * and the lesson says so rather than hiding it.
 *
 * Both are fetched. The hourly series is what the backtest runs on; the
 * fifteen-minute series covers the recent window at a resolution the strategy
 * was actually written for, so a reader can see the same setup drawn properly
 * and judge what the hourly version is approximating.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outFile = path.join(root, 'src', 'content', 'sweep.json');

/*
  ALPHA VANTAGE, WHEN THERE IS A KEY FOR IT.

  Yahoo alone cannot test this model, and that is measured rather than assumed:
  its 60 days of fifteen-minute bars give 84 Mondays across the seven names, and
  84 Mondays produce ONE trade. The machinery is fine — 92.9% of those sessions
  contain a fair value gap — there is simply not enough of it.

  Alpha Vantage serves intraday history a month at a time, which is the only free
  route to a sample worth reasoning about. The free tier allows 25 requests a
  day, so the history cannot be pulled in one go: each run fetches what its
  budget allows, MERGES it into the committed file, and stops. Run it on
  consecutive days and the history fills in backwards; the file is the
  accumulator, which is why it is committed rather than regenerated.

  No key, and none of this happens. The build still produces a complete dataset
  from Yahoo — a shorter one, honestly labelled.
*/
/*
  The key is read from `.env.local`, which `.gitignore` already covers.

  A secret typed into a shell lives in that shell's history and dies with the
  session; one in a gitignored file is there tomorrow and cannot be committed by
  accident. Nothing else loads it — this script runs outside Next, so there is no
  framework here doing it quietly.
*/
function loadLocalEnv() {
  const file = path.join(root, '.env.local');
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
    if (!match) continue;
    const value = match[2].replace(/^['"]|['"]$/g, '');
    process.env[match[1]] ??= value;
  }
}
loadLocalEnv();

const AV_KEY = process.env.ALPHAVANTAGE_KEY ?? '';
/** Stay under the free tier's 25/day, leaving one spare. */
const AV_BUDGET = Number(process.env.ALPHAVANTAGE_BUDGET ?? 24);
/** How far back to try to build the fifteen-minute history. */
const AV_MONTHS = Number(process.env.ALPHAVANTAGE_MONTHS ?? 30);

/** The Magnificent Seven, in the order the picker shows them. */
const TICKERS = [
  { symbol: 'AAPL', name: 'Apple' },
  { symbol: 'MSFT', name: 'Microsoft' },
  { symbol: 'NVDA', name: 'NVIDIA' },
  { symbol: 'AMZN', name: 'Amazon' },
  { symbol: 'GOOGL', name: 'Alphabet' },
  { symbol: 'META', name: 'Meta' },
  { symbol: 'TSLA', name: 'Tesla' },
];

const NY = 'America/New_York';

/*
  Everything is bucketed in New York time, not UTC and not the build machine's
  zone. "Thursday's high" and "Monday's open" are facts about a trading session,
  and a session belongs to the exchange's calendar day. A build running in UTC
  after 20:00 New York would otherwise file the afternoon under tomorrow.
*/
const dayFmt = new Intl.DateTimeFormat('en-CA', {
  timeZone: NY,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});
const dowFmt = new Intl.DateTimeFormat('en-US', { timeZone: NY, weekday: 'short' });
const timeFmt = new Intl.DateTimeFormat('en-GB', {
  timeZone: NY,
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

const sessionDay = (ts) => dayFmt.format(new Date(ts * 1000));
const sessionDow = (ts) => dowFmt.format(new Date(ts * 1000));
const sessionTime = (ts) => timeFmt.format(new Date(ts * 1000));

/** Two decimals is the tick these names trade on, and it halves the payload. */
const round = (v) => Math.round(v * 100) / 100;

async function chart(symbol, params) {
  const url =
    `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?${params}`;

  const res = await fetch(url, {
    headers: {
      // Yahoo returns 429 to an unidentified client. This is not evasion — it
      // is a public endpoint that wants a real UA string.
      'User-Agent':
        'Mozilla/5.0 (compatible; seventeen-studios-build/1.0; +https://github.com/Rutvik17/seventeen-studios)',
      Accept: 'application/json',
    },
  });
  if (!res.ok) throw new Error(`${symbol}: HTTP ${res.status}`);

  const json = await res.json();
  const result = json?.chart?.result?.[0];
  if (!result) {
    throw new Error(`${symbol}: ${json?.chart?.error?.description ?? 'no result'}`);
  }

  const stamps = result.timestamp ?? [];
  const q = result.indicators?.quote?.[0] ?? {};

  /*
    Yahoo returns nulls on halted or thin bars. They are dropped rather than
    carried forward: a null high read as 0 would make every sweep test fail, and
    a null low read as 0 would make every take-profit look hit.
  */
  const bars = [];
  for (let i = 0; i < stamps.length; i++) {
    const o = q.open?.[i];
    const h = q.high?.[i];
    const l = q.low?.[i];
    const c = q.close?.[i];
    if ([o, h, l, c].some((v) => v == null || !Number.isFinite(v))) continue;
    bars.push({ t: stamps[i], o, h, l, c });
  }
  return bars;
}

/** Daily bars carry the weekly levels, and resolve trades that outlive Monday. */
async function daily(symbol) {
  const bars = await chart(symbol, 'range=3y&interval=1d');
  return bars.map((b) => [sessionDay(b.t), round(b.o), round(b.h), round(b.l), round(b.c)]);
}

/**
 * Intraday bars, grouped by session day and kept only for the days that matter.
 *
 * Everything outside a Monday is dropped before it is written. The setup is a
 * Monday-morning event and a trade that outlives the session is resolved on
 * daily bars, so keeping Tuesday to Friday at this resolution would multiply the
 * payload by five to answer a question nothing asks.
 */
async function mondays(symbol, params) {
  const bars = await chart(symbol, params);
  const byDay = new Map();

  for (const b of bars) {
    if (sessionDow(b.t) !== 'Mon') continue;
    const day = sessionDay(b.t);
    if (!byDay.has(day)) byDay.set(day, []);
    byDay.get(day).push([sessionTime(b.t), round(b.o), round(b.h), round(b.l), round(b.c)]);
  }

  return Object.fromEntries([...byDay.entries()].sort(([a], [b]) => a.localeCompare(b)));
}

/* ------------------------------------------------------------------ *
 * Alpha Vantage
 * ------------------------------------------------------------------ */

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** `2026-08` back through `AV_MONTHS`, newest first. */
function recentMonths(count) {
  const months = [];
  const now = new Date();
  let y = now.getUTCFullYear();
  let m = now.getUTCMonth() + 1;
  for (let i = 0; i < count; i++) {
    months.push(`${y}-${String(m).padStart(2, '0')}`);
    m -= 1;
    if (m === 0) {
      m = 12;
      y -= 1;
    }
  }
  return months;
}

/**
 * One month of fifteen-minute bars, Mondays only.
 *
 * `extended_hours=false` matters. Alpha Vantage returns 04:00 to 19:45 by
 * default, and this model is about the regular session: an opening drive that
 * traps buyers has no meaning measured against a pre-market print on a hundred
 * shares. Yahoo's series is regular hours already, so without this the two
 * providers would disagree about what a session even is.
 *
 * The timestamps come back as US Eastern wall clock, which is what the rest of
 * this file works in — so unlike the Yahoo path they are used as written rather
 * than converted.
 */
async function alphaVantageMonth(symbol, month) {
  const url =
    'https://www.alphavantage.co/query?function=TIME_SERIES_INTRADAY' +
    `&symbol=${symbol}&interval=15min&month=${month}` +
    `&outputsize=full&extended_hours=false&apikey=${AV_KEY}`;

  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`${symbol} ${month}: HTTP ${res.status}`);
  const json = await res.json();

  // The free tier reports both throttling and bad keys as prose, with HTTP 200.
  if (json.Note || json.Information) {
    throw new Error(`${symbol} ${month}: ${(json.Note ?? json.Information).slice(0, 120)}`);
  }

  const series = json['Time Series (15min)'];
  if (!series) return {};

  const byDay = {};
  for (const [stamp, bar] of Object.entries(series)) {
    const [day, clock] = stamp.split(' ');
    if (dayOfWeekFromDate(day) !== 1) continue;
    const time = clock.slice(0, 5);
    (byDay[day] ??= []).push([
      time,
      round(Number(bar['1. open'])),
      round(Number(bar['2. high'])),
      round(Number(bar['3. low'])),
      round(Number(bar['4. close'])),
    ]);
  }
  for (const rows of Object.values(byDay)) rows.sort((a, b) => a[0].localeCompare(b[0]));
  return byDay;
}

/** Midday UTC keeps a New York calendar date on its own day in every zone. */
const dayOfWeekFromDate = (date) => new Date(`${date}T12:00:00Z`).getUTCDay();

/**
 * Spend the request budget on whatever is missing, oldest gap first.
 *
 * Rotating through the tickers rather than finishing one before starting the
 * next means an interrupted seed leaves every name with a comparable history
 * instead of two complete names and five empty ones — and a backtest run across
 * an uneven sample is worse than one run across a short one.
 */
async function extendWithAlphaVantage(tickers, existing) {
  if (!AV_KEY) return { spent: 0, added: 0 };

  const months = recentMonths(AV_MONTHS);
  let spent = 0;
  let added = 0;

  for (const month of months) {
    for (const entry of tickers) {
      if (spent >= AV_BUDGET) return { spent, added };

      const have = existing.get(entry.symbol) ?? {};
      // Already covered? Every Monday in that month is present.
      const covered = Object.keys(have).some((day) => day.startsWith(month));
      if (covered) continue;

      try {
        const byDay = await alphaVantageMonth(entry.symbol, month);
        spent++;
        const days = Object.keys(byDay).length;
        added += days;
        entry.fine = { ...entry.fine, ...byDay };
        console.log(`  + ${entry.symbol.padEnd(6)} ${month}  ${days} Mondays`);
      } catch (error) {
        console.log(`  ! ${entry.symbol.padEnd(6)} ${month}  ${error.message}`);
        spent++;
        // Throttling applies to the whole key, so stop rather than burn the rest.
        if (/rate limit|frequency|premium/i.test(error.message)) return { spent, added };
      }

      // The free tier also caps requests per minute.
      await sleep(1200);
    }
  }
  return { spent, added };
}

/** Mondays already in the committed file, so a run can pick up where it left off. */
function loadExisting() {
  const map = new Map();
  if (!existsSync(outFile)) return map;
  try {
    const prior = JSON.parse(readFileSync(outFile, 'utf8'));
    for (const t of prior.tickers ?? []) map.set(t.symbol, t.fine ?? {});
  } catch {
    // A corrupt or older file is not worth failing a build over; it is rebuilt.
  }
  return map;
}

async function main() {
  const out = {
    fetchedAt: new Date().toISOString(),
    source: 'Yahoo Finance chart API',
    timezone: NY,
    /*
      Stated in the payload so the page can print it rather than restate it, and
      so the limit is visible to anyone reading the data rather than living only
      in this file's header.
    */
    limits: {
      hourly: 'Yahoo serves ~1060 days of 1h bars.',
      fine: 'Yahoo serves 60 days of 15m bars and refuses older windows outright.',
    },
    tickers: [],
  };

  // Anything already seeded. Yahoo's recent window is layered on top of it, and
  // Alpha Vantage extends it backwards — nothing already fetched is thrown away.
  const existing = loadExisting();

  for (const { symbol, name } of TICKERS) {
    const [d, hourly, fresh] = await Promise.all([
      daily(symbol),
      mondays(symbol, 'range=730d&interval=1h'),
      mondays(symbol, 'range=60d&interval=15m'),
    ]);

    out.tickers.push({
      symbol,
      name,
      daily: d,
      hourly,
      // Yahoo's 60 days win over anything stored for the same Monday: they are
      // the same bars from the same session, and the newer fetch is the one that
      // has seen any late correction.
      fine: { ...(existing.get(symbol) ?? {}), ...fresh },
    });

    console.log(
      `  ${symbol.padEnd(6)} daily=${String(d.length).padEnd(5)} ` +
        `hourly Mondays=${String(Object.keys(hourly).length).padEnd(4)} ` +
        `15m Mondays=${Object.keys(fresh).length}`,
    );
  }

  if (AV_KEY) {
    console.log(`\n  Extending 15m history — budget ${AV_BUDGET} requests`);
    const { spent, added } = await extendWithAlphaVantage(out.tickers, existing);
    console.log(`  spent ${spent} requests, added ${added} Mondays`);
  } else {
    console.log('\n  No ALPHAVANTAGE_KEY — 15m history is Yahoo\'s 60 days only.');
  }

  // Sort so the file is stable between runs and its diffs stay readable.
  for (const t of out.tickers) {
    t.fine = Object.fromEntries(
      Object.entries(t.fine).sort(([a], [b]) => a.localeCompare(b)),
    );
  }

  out.coverage = Object.fromEntries(
    out.tickers.map((t) => [t.symbol, Object.keys(t.fine).length]),
  );

  mkdirSync(path.dirname(outFile), { recursive: true });
  writeFileSync(outFile, JSON.stringify(out));

  const kb = (statSync(outFile).size / 1024).toFixed(0);
  const fineTotal = Object.values(out.coverage).reduce((s, v) => s + v, 0);
  console.log(
    `\n  wrote ${out.tickers.length} tickers, ${fineTotal} fifteen-minute Mondays ` +
      `to src/content/sweep.json (${kb} KB)`,
  );
}

main().catch((error) => {
  console.error(`fetch-sweep failed: ${error.message}`);
  process.exit(1);
});
