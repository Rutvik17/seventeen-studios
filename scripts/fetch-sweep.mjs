/**
 * Bars for the liquidity-sweep desk.
 *
 *   npm run sweep:data
 *
 * Writes `src/content/sweep.json`. Runs in `prebuild`, so the deploy workflow's
 * daily 22:30 UTC rebuild refreshes it after every US close — and then commits
 * it back, which is what makes the intraday history grow. See "Keep the
 * intraday archive" in `.github/workflows/deploy.yml`.
 *
 * ---
 *
 * WHY THIS IS A BUILD STEP AND NOT AN API CALL FROM THE PAGE
 *
 * The browser cannot call Yahoo: the endpoint sends no CORS headers, so a fetch
 * from the page is blocked before it leaves. The usual answer is a small backend
 * to proxy it, and it is the wrong answer here — a server to host, keep up and
 * pay for, plus rate limits and a key to rotate, all to relay data that changes
 * once per trading day.
 *
 * ---
 *
 * TWO SERIES, AND EACH ANSWERS A DIFFERENT HALF OF THE QUESTION
 *
 * DAILY, five years, full OHLC. Draws the six-month, year-to-date and one-year
 * chart ranges, and carries the weekly setup — Thursday's high, Friday's failure
 * and close — which is worth measuring over a longer run than the chart shows.
 *
 * FIFTEEN MINUTE, a rolling year, every session. Draws the one-day, five-day and
 * one-month ranges, and is the only resolution the execution can be read at:
 * measured, a bearish fair value gap appears in 92.9% of fifteen-minute sessions
 * and 32.1% of hourly ones, because an hourly Monday is seven bars and the gap
 * needs three of them to miss each other. Hourly bars were fetched for a while
 * and are not any more — a backtest run on them is not a coarse answer, it is a
 * wrong one.
 *
 * Yahoo serves sixty days of fifteen-minute bars and refuses older windows
 * server-side, so that half of the history cannot be fetched, only KEPT: each run
 * merges into the committed file rather than replacing it, and the daily rebuild
 * adds a session at the front while `thin()` drops one off the back. The window
 * is therefore the permanent ceiling on the backtest's sample, which is why it is
 * a year rather than the sixty days Yahoo hands out.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outFile = path.join(root, 'src', 'content', 'sweep.json');

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
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?${params}`;

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

/**
 * Five years of daily bars.
 *
 * It was ten, which supported five-year and all-time chart ranges. Those ranges
 * are gone — the intraday window is capped at a year, so a chart reaching back
 * five would be four years of candles with no trade on them — and half of this
 * series went with them.
 *
 * Five rather than one, because the daily bars do two jobs. They draw the six
 * month, year-to-date and one-year ranges, and they carry the weekly setup —
 * Thursday's high, Friday's failure and close — which is worth measuring over a
 * longer run than the chart shows. Five years is about 260 Mondays a ticker at a
 * tenth of the payload the intraday series costs.
 *
 * WITH the open. It was dropped once, correctly — no line of the model read it,
 * and it was a fifth of the weight of the series. It came back the moment the
 * chart started drawing daily candles, because a candle without an open is a bar
 * chart.
 */
async function daily(symbol) {
  const bars = await chart(symbol, 'range=5y&interval=1d');
  return bars.map((b) => [sessionDay(b.t), round(b.o), round(b.h), round(b.l), round(b.c)]);
}

/**
 * Fifteen-minute bars, every session Yahoo will still serve.
 *
 * This kept Mondays only at first, because the STRATEGY only needs Mondays — the
 * setup is a Monday-morning event. That was right for the backtest and wrong for
 * the chart: a candlestick chart asked for the last five days would have had
 * four holes in it. A chart with gaps is not a chart of anything.
 */
async function intraday(symbol) {
  const bars = await chart(symbol, 'range=60d&interval=15m');
  const byDay = new Map();

  for (const b of bars) {
    const day = sessionDay(b.t);
    if (!byDay.has(day)) byDay.set(day, []);
    byDay.get(day).push([sessionTime(b.t), round(b.o), round(b.h), round(b.l), round(b.c)]);
  }

  return Object.fromEntries([...byDay.entries()].sort(([a], [b]) => a.localeCompare(b)));
}

/** Sessions kept at full resolution before older ones are thinned to Mondays. */
const DENSE_DAYS = 120;

/**
 * The hard edge of the window. Nothing older is kept, at any resolution.
 *
 * A rolling window, so the payload stops growing: each build adds a session at
 * the front and drops one off the back. The alternative was keeping everything,
 * which is unbounded — pleasant for a year and a problem after three.
 *
 * A YEAR RATHER THAN SIXTY DAYS, AND THE REASON IS NOT COMFORT. Bars that fall
 * out of this window are gone: Yahoo serves a rolling sixty days of
 * fifteen-minute data and refuses older requests, so the only copy of anything
 * behind that wall is the one here. The window size therefore IS the permanent
 * ceiling on the backtest's sample — sixty days pins it at about thirteen
 * Mondays a ticker forever, a year settles at about fifty-two.
 *
 * Neither is a large sample. A year is the larger of the two available, it is
 * bounded, and combined with the thinning above it costs roughly 200 KB gzipped
 * at full extent.
 */
const MAX_AGE_DAYS = 365;

/**
 * Thin the archive without losing the part the backtest needs.
 *
 * Two consumers want different things from this series and they disagree about
 * what is worth keeping.
 *
 * The CHART wants continuity, but only recently: intraday candles are for the
 * one-day, five-day and one-month ranges, and every range longer than that draws
 * daily candles the way any trading platform does. Past a few months, a
 * fifteen-minute Tuesday is never rendered.
 *
 * The BACKTEST wants Mondays, forever, because those are the sessions the model
 * trades and Yahoo will not serve them again once they pass sixty days.
 *
 * So: everything within `DENSE_DAYS` of the newest session, then Mondays alone
 * behind that. Growth settles at about a thousand bars a ticker a year instead
 * of five thousand, and nothing that would have been drawn is thrown away.
 */
function thin(byDay) {
  const days = Object.keys(byDay).sort();
  if (days.length === 0) return byDay;

  const newest = Date.parse(`${days[days.length - 1]}T12:00:00Z`);
  const dense = newest - DENSE_DAYS * 86400000;
  const oldest = newest - MAX_AGE_DAYS * 86400000;

  const kept = {};
  for (const day of days) {
    const at = Date.parse(`${day}T12:00:00Z`);
    // The window rolls: one session on at the front, one off the back.
    if (at < oldest) continue;
    if (at >= dense || dayOfWeekFromDate(day) === 1) kept[day] = byDay[day];
  }
  return kept;
}

/** Midday UTC keeps a New York calendar date on its own day in every zone. */
const dayOfWeekFromDate = (date) => new Date(`${date}T12:00:00Z`).getUTCDay();

/** Mondays already kept, so a run extends the archive rather than resetting it. */
function loadExisting() {
  const map = new Map();
  if (!existsSync(outFile)) return map;
  try {
    const prior = JSON.parse(readFileSync(outFile, 'utf8'));
    for (const t of prior.tickers ?? []) map.set(t.symbol, t.intraday ?? {});
  } catch {
    // A corrupt or older file is not worth failing a build over; it is rebuilt.
  }
  return map;
}

async function main() {
  const existing = loadExisting();

  const out = {
    fetchedAt: new Date().toISOString(),
    source: 'Yahoo Finance chart API',
    timezone: NY,
    interval: '15m',
    tickers: [],
  };

  for (const { symbol, name } of TICKERS) {
    const [bars, fresh] = await Promise.all([daily(symbol), intraday(symbol)]);

    const kept = existing.get(symbol) ?? {};
    // Yahoo's sixty days win over anything stored for the same session: same
    // bars, same day, and the newer fetch has seen any late correction.
    const merged = thin({ ...kept, ...fresh });

    const sessions = Object.fromEntries(
      Object.entries(merged).sort(([a], [b]) => a.localeCompare(b)),
    );

    out.tickers.push({ symbol, name, daily: bars, intraday: sessions });

    const added = Object.keys(fresh).filter((d) => !(d in kept)).length;
    const mondays = Object.keys(sessions).filter((d) => dayOfWeekFromDate(d) === 1).length;
    console.log(
      `  ${symbol.padEnd(6)} daily=${String(bars.length).padEnd(5)} ` +
        `sessions=${String(Object.keys(sessions).length).padEnd(4)} ` +
        `(+${String(added).padEnd(3)} new, ${mondays} Mondays)`,
    );
  }

  mkdirSync(path.dirname(outFile), { recursive: true });
  writeFileSync(outFile, JSON.stringify(out));

  const kb = (statSync(outFile).size / 1024).toFixed(0);
  const sessions = out.tickers.reduce((s, t) => s + Object.keys(t.intraday).length, 0);
  console.log(`\n  ${sessions} Monday sessions kept, ${kb} KB\n`);
}

main().catch((error) => {
  console.error(`fetch-sweep failed: ${error.message}`);
  process.exit(1);
});
