/**
 * The bars behind the liquidity-sweep desk.
 *
 * `sweep.json` is written by `scripts/fetch-sweep.mjs` at build time and
 * committed, because the intraday half of it cannot be re-fetched: Yahoo serves
 * a rolling sixty days of fifteen-minute bars and refuses older windows, so
 * every session past that wall exists only because a previous build kept it.
 *
 * Rows are stored as arrays rather than objects. `["2024-01-08", 187.2, 185.6,
 * 186.1]` against `{"date":"2024-01-08","high":187.2,…}` is the difference
 * between 40 bytes and 70 on seventeen thousand rows, and the shape is declared
 * once here rather than repeated on every one of them.
 */

import raw from './sweep.json';
import type { DailyBar, IntradayBar } from '@/lib/sweep';

/** `[date, open, high, low, close]`. The chart draws daily candles. */
type RawDaily = [string, number, number, number, number];
/** `[time, open, high, low, close]` — the session chart draws candles. */
type RawIntraday = [string, number, number, number, number];

type RawTicker = {
  symbol: string;
  name: string;
  daily: RawDaily[];
  intraday: Record<string, RawIntraday[]>;
};

const data = raw as unknown as {
  fetchedAt: string;
  source: string;
  timezone: string;
  interval: string;
  tickers: RawTicker[];
};

export type SweepTicker = {
  symbol: string;
  name: string;
  /** Ten years, for the weekly setup. */
  daily: DailyBar[];
  /** Mondays only, keyed by date. Sixty days deep and growing. */
  sessions: Record<string, IntradayBar[]>;
};

export const sweepMeta = {
  fetchedAt: data.fetchedAt,
  source: data.source,
  timezone: data.timezone,
  interval: data.interval,
  symbols: data.tickers.map((t) => ({ symbol: t.symbol, name: t.name })),
  /** Monday sessions held at intraday resolution, across all tickers. */
  sessions: data.tickers.reduce((sum, t) => sum + Object.keys(t.intraday).length, 0),
} as const;

/*
  Converted on demand and remembered.

  Seventeen thousand daily rows across seven tickers become seventeen thousand
  objects the moment anything touches them, and the desk shows ONE ticker at a
  time. Doing that at module scope would pay for six of them on every page load
  that reaches this file — including the six nobody clicks.
*/
const cache = new Map<string, SweepTicker>();

export function sweepTicker(symbol: string): SweepTicker | undefined {
  const hit = cache.get(symbol);
  if (hit) return hit;

  const source = data.tickers.find((t) => t.symbol === symbol);
  if (!source) return undefined;

  const built: SweepTicker = {
    symbol: source.symbol,
    name: source.name,
    daily: source.daily.map(([date, open, high, low, close]) => ({ date, open, high, low, close })),
    sessions: Object.fromEntries(
      Object.entries(source.intraday).map(([day, rows]) => [
        day,
        rows.map(([time, open, high, low, close]) => ({ time, open, high, low, close })),
      ]),
    ),
  };

  cache.set(symbol, built);
  return built;
}
