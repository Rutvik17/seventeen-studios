'use client';

/**
 * THE PRICE, BETWEEN BUILDS.
 *
 * The site is a static export: every number in it is baked when the site is
 * built, and the build runs once a day after the close. That is correct for
 * everything derived from a full history — the sentiment model, the
 * correlations, the volatility — and wrong for the price on the panel, which
 * was showing yesterday's close all through the following session.
 *
 * ---
 * WHY THIS FETCHES FROM raw.githubusercontent.com
 *
 * There is no server and there is not going to be one. Yahoo cannot be called
 * from the browser — it sends no CORS headers, so the request is blocked before
 * it leaves the page, which is the whole reason the data is baked in the first
 * place.
 *
 * So a workflow writes a small file to the repository's `data` branch every
 * fifteen minutes, and this reads THAT. Raw GitHub content sends
 * `Access-Control-Allow-Origin: *` and caches for five minutes — no key, no
 * server, no proxy, and a cadence that sits comfortably inside its own cache.
 *
 * ---
 * IT MUST DEGRADE TO THE BAKED NUMBER, SILENTLY
 *
 * The fetch can fail for reasons that are nobody's fault: the visitor is
 * offline, GitHub is having a moment, the workflow has not run yet. In every
 * one of those cases the page must show the number the build baked in and say
 * nothing about it. A portfolio site that renders an error where a price should
 * be is worse than one quoting a close from yesterday.
 *
 * That is why this returns `null` on failure rather than throwing, and why the
 * caller supplies the fallback rather than this deciding for it.
 */

import { useEffect, useState } from 'react';

/** Where the fifteen-minute workflow publishes. See `.github/workflows/quote.yml`. */
const QUOTE_URL =
  'https://raw.githubusercontent.com/Rutvik17/seventeen-studios/data/quote.json';

/*
  Re-read on the same period the CDN caches for. Polling faster cannot produce a
  newer answer — it just re-reads the same cached body — and polling much slower
  would leave the page staler than the data it is being handed.
*/
const POLL_MS = 5 * 60 * 1000;

export type LiveQuote = {
  symbol: string;
  price: number;
  changeDay: number;
  /** Exchange timestamp for the print, ISO. */
  asOf: string;
  /** When the workflow fetched it, ISO. */
  fetchedAt: string;
};

type Payload = { fetchedAt?: string; quotes?: Array<Omit<LiveQuote, 'fetchedAt'>> };

/**
 * The live quote for one symbol, or null while it is unknown.
 *
 * Null is the honest first value: this cannot run during a static export, so
 * the first paint is always the baked number and the live one arrives after.
 * Returning a placeholder object instead would make the caller unable to tell
 * "no data yet" from "data that happens to be zero".
 */
export function useLiveQuote(symbol: string): LiveQuote | null {
  const [quote, setQuote] = useState<LiveQuote | null>(null);

  useEffect(() => {
    // Guards against setting state after the component is gone, which is the
    // ordinary way a poll like this leaks.
    let alive = true;

    async function read() {
      try {
        const res = await fetch(QUOTE_URL, { cache: 'no-store' });
        if (!res.ok) return;

        const payload: Payload = await res.json();
        const found = payload.quotes?.find((q) => q.symbol === symbol);
        if (!found || !alive) return;

        // A malformed or partial file must not blank the readout.
        if (!Number.isFinite(found.price) || !Number.isFinite(found.changeDay)) return;

        setQuote({ ...found, fetchedAt: payload.fetchedAt ?? '' });
      } catch {
        // Offline, blocked, rate-limited, or the branch does not exist yet.
        // The caller keeps showing what the build baked in.
      }
    }

    read();
    const timer = setInterval(read, POLL_MS);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [symbol]);

  return quote;
}
