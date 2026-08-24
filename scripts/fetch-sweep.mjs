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
 * DAILY, ten years. The weekly setup — Thursday's high, Friday's failure and
 * close, and how near Monday came to that high — is entirely a daily-bar
 * question. Ten years of it is about five hundred Mondays a ticker, which is a
 * sample large enough to say something.
 *
 * FIFTEEN MINUTE, Mondays only, accumulating. The execution — the structure
 * shift, the gap, the fill — cannot be read at a coarser resolution. Measured:
 * a bearish fair value gap appears in 92.9% of fifteen-minute sessions and only
 * 32.1% of hourly ones, because an hourly Monday is seven bars and the gap needs
 * three of them to miss each other. Hourly bars were fetched for a while and are
 * not any more: a backtest run on them is not a coarse answer, it is a wrong
 * one.
 *
 * Yahoo serves sixty days of fifteen-minute bars and refuses older windows
 * server-side, so that half of the history cannot be fetched — only kept. Each
 * run merges into the committed file rather than replacing it.
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
 * Ten years of daily bars: the weekly setup, over a sample worth quoting.
 *
 * No OPEN. Nothing reads it — the setup is Thursday's high against Friday's
 * high, low and close, and ATR is built from high, low and close. A field
 * nothing reads is a fifth of this series' weight for nothing.
 */
async function daily(symbol) {
  const bars = await chart(symbol, 'range=10y&interval=1d');
  return bars.map((b) => [sessionDay(b.t), round(b.h), round(b.l), round(b.c)]);
}

/**
 * Fifteen-minute bars, Mondays only.
 *
 * Everything outside a Monday is dropped before it is written. The setup is a
 * Monday-morning event and a trade that outlives the session is resolved on
 * daily bars, so keeping Tuesday to Friday at this resolution would multiply the
 * payload by five to answer a question nothing asks.
 */
async function mondays(symbol) {
  const bars = await chart(symbol, 'range=60d&interval=15m');
  const byDay = new Map();

  for (const b of bars) {
    if (sessionDow(b.t) !== 'Mon') continue;
    const day = sessionDay(b.t);
    if (!byDay.has(day)) byDay.set(day, []);
    byDay.get(day).push([sessionTime(b.t), round(b.o), round(b.h), round(b.l), round(b.c)]);
  }

  return Object.fromEntries([...byDay.entries()].sort(([a], [b]) => a.localeCompare(b)));
}

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
    const [bars, fresh] = await Promise.all([daily(symbol), mondays(symbol)]);

    const kept = existing.get(symbol) ?? {};
    // Yahoo's sixty days win over anything stored for the same Monday: same
    // bars, same session, and the newer fetch has seen any late correction.
    const merged = { ...kept, ...fresh };

    out.tickers.push({
      symbol,
      name,
      daily: bars,
      intraday: Object.fromEntries(
        Object.entries(merged).sort(([a], [b]) => a.localeCompare(b)),
      ),
    });

    const added = Object.keys(fresh).filter((d) => !(d in kept)).length;
    console.log(
      `  ${symbol.padEnd(6)} daily=${String(bars.length).padEnd(5)} ` +
        `Mondays=${String(Object.keys(merged).length).padEnd(4)} (+${added})`,
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
