/**
 * Macro series: rates, credit, volatility, commodities, and the FOMC calendar.
 *
 *   npm run data:macro
 *
 * Writes `data/macro.json` — gitignored.
 *
 * ---
 * WHY EVERY SERIES HERE IS A MARKET PRICE
 *
 * Market prices are never restated. A yield printed on 2015-06-05 is still that
 * yield today, so using it on 2015-06-05 is honest.
 *
 * Economic STATISTICS are a different animal and are deliberately absent. Non-farm
 * payrolls, GDP, CPI and retail sales are revised for months and sometimes years,
 * so today's value for a 2015 month is a number nobody had in 2015 — using it is
 * look-ahead bias of the purest kind. The correct source for those is ALFRED's
 * vintage API, which returns the figure AS PUBLISHED on a given date.
 *
 * That was tested rather than assumed: `fredgraph.csv?...&vintage_date=2015-06-05`
 * returns byte-identical output to the plain request. The parameter is silently
 * ignored on the keyless endpoint. Real vintages need an API key, so revised
 * statistics stay out until there is one.
 *
 * ---
 * A LICENCE SURPRISE WORTH RECORDING
 *
 * The obvious credit-spread series, ICE BofA high-yield OAS (BAMLH0A0HYM2), is
 * restricted to a THREE-YEAR rolling window on the free endpoint — it returns
 * 793 rows no matter what date range is requested, which looks like a short
 * history rather than a licence boundary. `BAA10Y`, Moody's Baa corporate yield
 * minus the 10-year Treasury, carries the same economic content and returns the
 * full 4,364 rows.
 */

import { mkdirSync, writeFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outFile = path.join(root, 'data', 'macro.json');

const START = '2009-12-01';
const UA = { 'User-Agent': 'Mozilla/5.0 (compatible; seventeen-studios-build/1.0)' };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** FRED series, keyless CSV. All are market prices or policy rates: never revised. */
const FRED = [
  ['fedFunds', 'DFF'],
  ['y3m', 'DGS3MO'],
  ['y2', 'DGS2'],
  ['y10', 'DGS10'],
  ['curve2s10s', 'T10Y2Y'],
  ['breakeven10', 'T10YIE'],
  ['creditSpread', 'BAA10Y'],
];

/** Yahoo symbols: volatility complex, commodities, dollar. */
const YAHOO = [
  ['vix', '^VIX'],
  ['vvix', '^VVIX'],
  ['move', '^MOVE'],
  ['wti', 'CL=F'],
  ['brent', 'BZ=F'],
  ['copper', 'HG=F'],
  ['gold', 'GC=F'],
  ['dollar', 'DX-Y.NYB'],
];

/*
  FOMC meeting dates — the last day of each scheduled meeting.

  Hardcoded, and that is the right call rather than a shortcut. Historical FOMC
  dates are a fixed public record that never changes, and the Fed publishes the
  forward calendar roughly a year ahead — which is precisely what makes
  "days until the next meeting" a legitimate point-in-time feature rather than
  look-ahead. Scraping federalreserve.gov every night would add a fragile
  dependency to recover a list that is already settled.
*/
const FOMC = [
  '2010-01-27','2010-03-16','2010-04-28','2010-06-23','2010-08-10','2010-09-21','2010-11-03','2010-12-14',
  '2011-01-26','2011-03-15','2011-04-27','2011-06-22','2011-08-09','2011-09-21','2011-11-02','2011-12-13',
  '2012-01-25','2012-03-13','2012-04-25','2012-06-20','2012-08-01','2012-09-13','2012-10-24','2012-12-12',
  '2013-01-30','2013-03-20','2013-05-01','2013-06-19','2013-07-31','2013-09-18','2013-10-30','2013-12-18',
  '2014-01-29','2014-03-19','2014-04-30','2014-06-18','2014-07-30','2014-09-17','2014-10-29','2014-12-17',
  '2015-01-28','2015-03-18','2015-04-29','2015-06-17','2015-07-29','2015-09-17','2015-10-28','2015-12-16',
  '2016-01-27','2016-03-16','2016-04-27','2016-06-15','2016-07-27','2016-09-21','2016-11-02','2016-12-14',
  '2017-02-01','2017-03-15','2017-05-03','2017-06-14','2017-07-26','2017-09-20','2017-11-01','2017-12-13',
  '2018-01-31','2018-03-21','2018-05-02','2018-06-13','2018-08-01','2018-09-26','2018-11-08','2018-12-19',
  '2019-01-30','2019-03-20','2019-05-01','2019-06-19','2019-07-31','2019-09-18','2019-10-30','2019-12-11',
  '2020-01-29','2020-03-15','2020-04-29','2020-06-10','2020-07-29','2020-09-16','2020-11-05','2020-12-16',
  '2021-01-27','2021-03-17','2021-04-28','2021-06-16','2021-07-28','2021-09-22','2021-11-03','2021-12-15',
  '2022-01-26','2022-03-16','2022-05-04','2022-06-15','2022-07-27','2022-09-21','2022-11-02','2022-12-14',
  '2023-02-01','2023-03-22','2023-05-03','2023-06-14','2023-07-26','2023-09-20','2023-11-01','2023-12-13',
  '2024-01-31','2024-03-20','2024-05-01','2024-06-12','2024-07-31','2024-09-18','2024-11-07','2024-12-18',
  '2025-01-29','2025-03-19','2025-05-07','2025-06-18','2025-07-30','2025-09-17','2025-10-29','2025-12-10',
  '2026-01-28','2026-03-18','2026-04-29','2026-06-17','2026-07-29','2026-09-16','2026-11-04','2026-12-16',
];

async function fred(id) {
  const url = `https://fred.stlouisfed.org/graph/fredgraph.csv?id=${id}&cosd=${START}`;
  const res = await fetch(url, { headers: UA });
  if (!res.ok) throw new Error(`FRED ${id}: HTTP ${res.status}`);
  const lines = (await res.text()).trim().split('\n');
  const out = {};
  for (const line of lines.slice(1)) {
    const [date, raw] = line.split(',');
    const v = Number(raw);
    // FRED writes "." for a day the series did not print — a holiday, or a
    // market that was shut. Not zero, and not a gap to interpolate over.
    if (date && Number.isFinite(v)) out[date] = v;
  }
  return out;
}

async function yahoo(symbol) {
  const p1 = Math.floor(new Date(START).getTime() / 1000);
  const p2 = Math.floor(Date.now() / 1000);
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}` +
    `?period1=${p1}&period2=${p2}&interval=1d`;
  const res = await fetch(url, { headers: UA });
  if (!res.ok) throw new Error(`${symbol}: HTTP ${res.status}`);
  const r = (await res.json())?.chart?.result?.[0];
  if (!r) throw new Error(`${symbol}: no result`);
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit',
  });
  const out = {};
  const closes = r.indicators?.adjclose?.[0]?.adjclose ?? r.indicators?.quote?.[0]?.close ?? [];
  (r.timestamp ?? []).forEach((ts, i) => {
    const v = closes[i];
    if (Number.isFinite(v)) out[fmt.format(new Date(ts * 1000))] = +v.toFixed(4);
  });
  return out;
}

async function main() {
  const series = {};
  const failures = [];

  for (const [name, id] of FRED) {
    try {
      series[name] = await fred(id);
      const keys = Object.keys(series[name]);
      console.log(`  ${name.padEnd(14)} ${String(keys.length).padStart(5)} obs  ${keys[0]} .. ${keys.at(-1)}`);
    } catch (e) { failures.push(e.message); console.log(`  ! ${e.message}`); }
    await sleep(250);
  }

  for (const [name, symbol] of YAHOO) {
    try {
      series[name] = await yahoo(symbol);
      const keys = Object.keys(series[name]);
      console.log(`  ${name.padEnd(14)} ${String(keys.length).padStart(5)} obs  ${keys[0]} .. ${keys.at(-1)}`);
    } catch (e) { failures.push(e.message); console.log(`  ! ${e.message}`); }
    await sleep(250);
  }

  /*
    Without VIX there is no volatility regime and the risk engine has nothing to
    read. A macro file that quietly lost it would still load and still train.
  */
  if (!series.vix || Object.keys(series.vix).length < 3000) {
    throw new Error('VIX missing or short — the regime model has no volatility input');
  }

  const out = {
    fetchedAt: new Date().toISOString(),
    start: START,
    note: 'Market prices and policy rates only — never revised, so same-day use is point-in-time honest. Revised statistics (NFP, GDP, CPI) are deliberately excluded; they need ALFRED vintages.',
    series,
    fomc: FOMC,
  };

  mkdirSync(path.dirname(outFile), { recursive: true });
  writeFileSync(outFile, JSON.stringify(out));
  console.log(`\n  ${Object.keys(series).length} series, ${FOMC.length} FOMC meetings`);
  if (failures.length) console.log(`  ${failures.length} failed: ${failures.join('; ')}`);
  console.log(`  wrote data/macro.json (${(statSync(outFile).size / 1024).toFixed(0)} KB, gitignored)`);
}

main().catch((error) => {
  console.error(`fetch-macro failed: ${error.message}`);
  process.exit(1);
});
