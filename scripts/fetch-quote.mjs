#!/usr/bin/env node
/**
 * The live price, and nothing else.
 *
 * ---
 *
 * WHY THIS IS SEPARATE FROM fetch-market.mjs
 *
 * The site is a static export. Its numbers are baked at build time, so between
 * builds the readout shows whatever the last build saw — which was fine when
 * the build ran nightly and the panel quoted a closing price, and stopped being
 * fine the moment the readout was expected to track the session.
 *
 * Rebuilding and redeploying the whole site every fifteen minutes to move one
 * number would be the obvious fix and the wrong one: it is two minutes of CI
 * and a full Pages deployment to change four digits.
 *
 * So this writes a SMALL FILE to a data branch and the browser reads it
 * directly. `raw.githubusercontent.com` sends `Access-Control-Allow-Origin: *`
 * and caches for five minutes, which is exactly the shape this needs — no
 * server, no deploy, no key, and the static build still carries a full copy as
 * the fallback for when the fetch fails or the visitor is offline.
 *
 * ---
 * WHAT IS DELIBERATELY NOT IN HERE
 *
 * The sentiment model's reading, which is what chooses the character and the
 * pose on the OLED. Its features are daily returns over sixty sessions and it
 * predicts the NEXT DAY's direction, so recomputing it every fifteen minutes
 * would move the companion around on noise and present it as new information.
 * Price is live; the model's opinion is daily. Those are different things and
 * the panel should not blur them.
 */
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '..', 'quote.json');

const SYMBOLS = ['NVDA', 'TSLA', 'AMZN', 'GOOGL', 'RKLB', 'QCOM'];

async function quote(symbol) {
  const res = await fetch(
    `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?range=1d&interval=1d`,
    {
      headers: {
        // Yahoo returns 429 to an unidentified client. Not evasion — a public
        // endpoint that wants a real UA string.
        'User-Agent':
          'Mozilla/5.0 (compatible; seventeen-studios-quote/1.0; +https://github.com/Rutvik17/seventeen-studios)',
        Accept: 'application/json',
      },
    },
  );
  if (!res.ok) throw new Error(`${symbol}: HTTP ${res.status}`);

  const meta = (await res.json())?.chart?.result?.[0]?.meta;
  if (!meta) throw new Error(`${symbol}: no meta in payload`);

  const price = meta.regularMarketPrice;
  const previous = meta.chartPreviousClose ?? meta.previousClose;
  if (!Number.isFinite(price) || !Number.isFinite(previous) || previous <= 0) {
    throw new Error(`${symbol}: price ${price} / previous ${previous}`);
  }

  return {
    symbol,
    price: Math.round(price * 100) / 100,
    // Against the PREVIOUS CLOSE, which is what "today's move" means and what
    // the daily build computes. Deriving it any other way would make the live
    // number disagree with the baked one for no reason.
    changeDay: Math.round(((price / previous - 1) * 100) * 100) / 100,
    // The exchange's clock, not the runner's — a build in one timezone must not
    // relabel a New York session.
    asOf: new Date(meta.regularMarketTime * 1000).toISOString(),
    marketState: meta.marketState ?? 'UNKNOWN',
  };
}

const quotes = [];
const failed = [];

for (const symbol of SYMBOLS) {
  try {
    quotes.push(await quote(symbol));
  } catch (error) {
    // One bad symbol must not cost the other five. A partial file is useful;
    // no file at all would silently pin the readout to the last build.
    failed.push(`${symbol}: ${error.message}`);
  }
}

if (!quotes.length) {
  console.error('quote: every symbol failed, refusing to write an empty file');
  for (const f of failed) console.error(`  ${f}`);
  process.exit(1);
}

await writeFile(
  OUT,
  `${JSON.stringify({ fetchedAt: new Date().toISOString(), quotes }, null, 2)}\n`,
);

for (const q of quotes) {
  console.log(`  ${q.symbol.padEnd(6)} ${String(q.price).padStart(8)}  ${q.changeDay >= 0 ? '+' : ''}${q.changeDay}%  ${q.marketState}`);
}
if (failed.length) for (const f of failed) console.warn(`  ! ${f}`);
console.log(`quote: wrote ${quotes.length}/${SYMBOLS.length} to ${OUT}`);
