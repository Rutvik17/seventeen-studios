#!/usr/bin/env node
/**
 * Fetch daily closes and write the market fixture the site ships with.
 *
 * ---
 *
 * WHY THIS RUNS AT BUILD TIME AND NOT IN THE BROWSER
 *
 * The site is a static export on GitHub Pages: there is no server, no API
 * route, and nowhere to hide a key. Calling a price API from the page itself
 * fails anyway — Yahoo's endpoints send no CORS headers, so the browser blocks
 * the response before any code of ours runs. Every "live stock ticker on a
 * static site" tutorial either proxies through a server or is quietly broken.
 *
 * So the fetch happens here, on a machine that has no same-origin policy, and
 * the result is committed as JSON. The scheduled deploy workflow already runs
 * on this repository, so the data refreshes on its own — real prices, updated
 * daily, no key in the bundle, and the page stays a pile of static files.
 *
 * ---
 *
 * IT MUST NEVER BREAK THE BUILD
 *
 * A portfolio that fails to deploy because a third party rate-limited us is a
 * worse outcome than a portfolio showing yesterday's prices. Any failure —
 * network, shape change, one bad ticker — logs a warning, leaves the existing
 * committed fixture in place, and exits zero.
 *
 * Run: node scripts/fetch-market.mjs
 */

import { writeFile, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '..', 'src', 'content', 'market.json');

const TICKERS = [
  { symbol: 'NVDA', name: 'NVIDIA' },
  { symbol: 'TSLA', name: 'Tesla' },
  { symbol: 'AMZN', name: 'Amazon' },
  { symbol: 'GOOGL', name: 'Alphabet' },
  { symbol: 'RKLB', name: 'Rocket Lab' },
  { symbol: 'QCOM', name: 'Qualcomm' },
];

/** Trading days in a year. The constant every annualisation below depends on. */
const TRADING_DAYS = 252;

async function fetchOne(symbol) {
  const url =
    `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}` +
    `?range=2y&interval=1d`;

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
  if (!result) throw new Error(`${symbol}: no result in payload`);

  const stamps = result.timestamp ?? [];
  const closes = result.indicators?.adjclose?.[0]?.adjclose
    ?? result.indicators?.quote?.[0]?.close
    ?? [];

  // Yahoo returns nulls on halted days. They must be dropped rather than
  // zero-filled: a null read as 0 produces a −100% return and poisons both the
  // mean and the variance for the whole window.
  const series = [];
  for (let i = 0; i < stamps.length; i++) {
    const c = closes[i];
    if (typeof c === 'number' && Number.isFinite(c) && c > 0) {
      series.push({ t: stamps[i], c });
    }
  }
  if (series.length < 60) throw new Error(`${symbol}: only ${series.length} usable closes`);
  return series;
}

/**
 * Annualised drift and volatility from log returns.
 *
 * Log returns, not simple returns, and the reason matters: log returns are
 * additive over time, so the sum over a year is exactly the year's return and
 * scaling by √252 is legitimate. Simple returns are not additive — a +10% day
 * followed by a −10% day is −1%, not 0% — so annualising their standard
 * deviation is subtly wrong, and it is the single most common error in
 * hand-rolled volatility code.
 *
 * The sample variance uses n−1 (Bessel's correction). With ~500 observations
 * the difference is immaterial, but using n understates the variance and this
 * feeds a risk model, where understating variance is the direction that hurts.
 */
function statistics(series) {
  const logReturns = [];
  for (let i = 1; i < series.length; i++) {
    logReturns.push(Math.log(series[i].c / series[i - 1].c));
  }

  const n = logReturns.length;
  const mean = logReturns.reduce((s, r) => s + r, 0) / n;
  const variance =
    logReturns.reduce((s, r) => s + (r - mean) * (r - mean), 0) / (n - 1);
  const dailyVol = Math.sqrt(variance);

  return {
    // The drift of the LOG price. Adding back half the variance recovers the
    // expected simple return, which is what a reader means by "expected return".
    drift: round(mean * TRADING_DAYS + (variance * TRADING_DAYS) / 2, 5),
    volatility: round(dailyVol * Math.sqrt(TRADING_DAYS), 5),
    observations: n,
  };
}

/** Daily log returns, keyed by session timestamp. */
function logReturns(series) {
  const out = new Map();
  for (let i = 1; i < series.length; i++) {
    out.set(series[i].t, Math.log(series[i].c / series[i - 1].c));
  }
  return out;
}

/**
 * Pearson correlation between two aligned return series.
 *
 *     ρ = Σ(x − x̄)(y − ȳ) ÷ √( Σ(x − x̄)² × Σ(y − ȳ)² )
 *
 * Aligned on SHARED session timestamps, not by array index. Index alignment is
 * the classic error here: Rocket Lab listed years after Alphabet, so position 0
 * of one series is a different date from position 0 of the other, and lining
 * them up by index correlates unrelated days. That produces a number near zero
 * and makes two names look independent when they are not — the exact direction
 * that understates portfolio risk.
 */
function correlation(a, b) {
  const xs = [];
  const ys = [];
  for (const [t, x] of a) {
    const y = b.get(t);
    if (y !== undefined) {
      xs.push(x);
      ys.push(y);
    }
  }
  const n = xs.length;
  if (n < 30) return null;

  const mx = xs.reduce((s, v) => s + v, 0) / n;
  const my = ys.reduce((s, v) => s + v, 0) / n;
  let num = 0, dx = 0, dy = 0;
  for (let i = 0; i < n; i++) {
    const a1 = xs[i] - mx;
    const b1 = ys[i] - my;
    num += a1 * b1;
    dx += a1 * a1;
    dy += b1 * b1;
  }
  const den = Math.sqrt(dx * dy);
  return den === 0 ? null : { rho: round(num / den, 4), overlap: n };
}

/** Trailing return over the last `days` sessions, as a simple percentage. */
function trailing(series, days) {
  if (series.length <= days) return null;
  const a = series[series.length - 1 - days].c;
  const b = series[series.length - 1].c;
  return round((b / a - 1) * 100, 2);
}

function round(v, dp) {
  const f = Math.pow(10, dp);
  return Math.round(v * f) / f;
}

async function main() {
  const assets = [];
  const failures = [];

  for (const { symbol, name } of TICKERS) {
    try {
      const series = await fetchOne(symbol);
      const stats = statistics(series);
      const last = series[series.length - 1];

      assets.push({
        symbol,
        name,
        // Kept only long enough to build the correlation matrix below; stripped
        // before writing, because six 500-point return series is 24 KB of JSON
        // nobody reads and the matrix is the only thing downstream needs.
        _returns: logReturns(series),
        _stamps: series.map((s) => s.t),
        price: round(last.c, 2),
        asOf: new Date(last.t * 1000).toISOString().slice(0, 10),
        ...stats,
        changeDay: trailing(series, 1),
        changeMonth: trailing(series, 21),
        changeYear: trailing(series, TRADING_DAYS),
        // A downsampled close series for the sparkline. 120 points is more
        // than any sparkline can resolve and a tenth of the payload.
        spark: downsample(series.map((s) => s.c), 120).map((v) => round(v, 2)),
      });
      console.log(
        `  ${symbol.padEnd(6)} $${String(round(last.c, 2)).padEnd(9)} ` +
          `vol ${(stats.volatility * 100).toFixed(1)}%  n=${stats.observations}`,
      );
    } catch (error) {
      failures.push(`${symbol}: ${error.message}`);
    }
  }

  if (assets.length === 0) {
    console.warn('! no tickers fetched; keeping the committed fixture');
    failures.forEach((f) => console.warn(`  ${f}`));
    return;
  }

  // A partial fetch is worse than a stale one: the risk desk compares assets,
  // and a table where two names silently vanished invites the wrong conclusion.
  if (failures.length > 0) {
    console.warn(`! ${failures.length} ticker(s) failed; keeping the committed fixture`);
    failures.forEach((f) => console.warn(`  ${f}`));
    return;
  }

  /*
    The correlation matrix, from the real return series.

    This is what makes the risk desk a PORTFOLIO rather than six separate bets.
    Add two assets that move together and you get almost no risk reduction; add
    two that do not and the combined swing is smaller than either alone. That
    effect is diversification, it is entirely contained in these numbers, and
    without them a multi-asset simulation is just a weighted average wearing a
    costume.
  */
  const correlations = [];
  for (let i = 0; i < assets.length; i++) {
    const row = [];
    for (let j = 0; j < assets.length; j++) {
      if (i === j) {
        row.push(1);
        continue;
      }
      const c = correlation(assets[i]._returns, assets[j]._returns);
      row.push(c ? c.rho : 0);
    }
    correlations.push(row);
  }

  // Smallest overlap across every pair — the window the matrix is really
  // measured over, which is set by the most recently listed name.
  let minOverlap = Infinity;
  for (let i = 0; i < assets.length; i++) {
    for (let j = i + 1; j < assets.length; j++) {
      const c = correlation(assets[i]._returns, assets[j]._returns);
      if (c) minOverlap = Math.min(minOverlap, c.overlap);
    }
  }

  for (const a of assets) {
    delete a._returns;
    delete a._stamps;
  }

  const payload = {
    fetchedAt: new Date().toISOString(),
    correlations,
    correlationSessions: Number.isFinite(minOverlap) ? minOverlap : 0,
    tradingDays: TRADING_DAYS,
    window: '2y daily',
    source: 'Yahoo Finance chart API, adjusted closes',
    assets,
  };

  const previous = await readFile(OUT, 'utf8').catch(() => null);
  const next = JSON.stringify(payload, null, 2) + '\n';
  if (previous === next) {
    console.log('  unchanged');
    return;
  }
  await writeFile(OUT, next, 'utf8');
  console.log(`  wrote ${assets.length} assets to src/content/market.json`);
}

function downsample(values, target) {
  if (values.length <= target) return values;
  const step = values.length / target;
  const out = [];
  for (let i = 0; i < target; i++) out.push(values[Math.floor(i * step)]);
  out.push(values[values.length - 1]);
  return out;
}

main().catch((error) => {
  // Never fail the build. See the note at the top.
  console.warn(`! market fetch failed: ${error.message}`);
});
