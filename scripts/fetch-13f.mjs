#!/usr/bin/env node
/**
 * INSTITUTIONAL OWNERSHIP, QUARTER BY QUARTER.
 *
 * Every manager with over $100M under discretion files a 13F within 45 days of
 * each quarter end, listing what they hold. Aggregated across all of them it is
 * the closest thing to a census of who owns what — and its CHANGE is the part
 * that might carry information: who is accumulating, who is leaving.
 *
 * ---
 * WHY THE BULK DATASETS AND NOT EDGAR
 *
 * The note in ENGINE_TODO called the fetch the hard part, because thousands of
 * institutions file each quarter and the data has to be aggregated BY HOLDING
 * rather than by filer. Fetching filings one at a time would be tens of
 * thousands of requests per quarter.
 *
 * The SEC already does the aggregation: one ZIP per quarter containing every
 * filer's holdings as a single INFOTABLE.tsv. 53 downloads covers 2013 to now,
 * roughly 4 seconds each. The hard part turned out to be finding the right URL.
 *
 * ---
 * WHY CUSIPS HAVE TO BE MATCHED BY NAME
 *
 * 13F identifies securities by CUSIP. Our universe is tickers. There is no free
 * public CUSIP-to-ticker map — CUSIP is licensed — so the join is made on the
 * issuer NAME, which the filings do carry.
 *
 * That is fuzzy, so it is measured rather than trusted: the match rate is
 * printed and any name that does not match cleanly is DROPPED rather than
 * guessed at. A missing quarter is a null the model handles natively; a wrong
 * CUSIP is a lie about who owns a company.
 *
 * Run: node scripts/fetch-13f.mjs           (cached per quarter)
 *      node scripts/fetch-13f.mjs --limit=4 (a few quarters, to try it)
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { extract } from './_zip.mjs';

const ROOT = path.join(import.meta.dirname, '..');
const DIR = path.join(ROOT, 'data', '13f');
const OUT = path.join(ROOT, 'data', '13f.json');
const INDEX = 'https://www.sec.gov/data-research/sec-markets-data/form-13f-data-sets';

/* The SEC asks for a real contact in the agent string, and returns 403 without one. */
const UA = { 'User-Agent': 'seventeen-studios-research/1.0 (patelrutvik1702@gmail.com)' };

const limitFlag = process.argv.find((a) => a.startsWith('--limit='));
const LIMIT = limitFlag ? Number(limitFlag.slice(8)) : Infinity;

mkdirSync(DIR, { recursive: true });

/* ------------------------------------------------------------ name matching */

const STOP = new Set(['INC', 'CORP', 'CORPORATION', 'CO', 'COMPANY', 'CLASS', 'CL', 'COM', 'LTD',
  'LLC', 'PLC', 'HLDG', 'HOLDINGS', 'HLDGS', 'THE', 'NEW', 'SA', 'NV', 'AG', 'TRUST', 'REIT',
  'GROUP', 'GRP', 'INTERNATIONAL', 'INTL', 'AND']);

const tokens = (s) => s.toUpperCase().replace(/[^A-Z0-9 ]/g, ' ').split(/\s+/)
  .filter((t) => t && !STOP.has(t));

/*
  13F issuer names use contractions that drop INTERNAL letters — MATLS for
  MATERIALS, LABS for LABORATORIES, PWR for POWER, EQ for EQUITIES. None of
  those is a prefix, but every one is a SUBSEQUENCE, which is what an
  abbreviation is. Anchored on a shared first letter and three characters
  minimum so unrelated tokens cannot drift into each other.
*/
function subsequence(short, long) {
  if (short.length < 3 || short[0] !== long[0]) return false;
  let i = 0;
  for (const ch of long) if (ch === short[i] && ++i === short.length) return true;
  return false;
}
const alike = (a, b) => a === b || (a.length < b.length ? subsequence(a, b) : subsequence(b, a));

/** Our universe, from the most recent constituent snapshot. */
function universe() {
  const dir = path.join(ROOT, 'archive', 'constituents');
  const latest = readdirSync(dir).filter((f) => f.endsWith('.csv')).sort().pop();
  const rows = readFileSync(path.join(dir, latest), 'utf8').trim().split('\n').slice(1);
  return rows.map((r) => {
    const m = r.match(/^([^,]+),([^,]*),"([^"]*)"/);
    return m ? { symbol: m[1], name: m[3] } : null;
  }).filter(Boolean);
}

/* ------------------------------------------------------------------ parsing */

/**
 * One quarter's INFOTABLE, aggregated by CUSIP.
 *
 * Walked as bytes rather than turned into a string: a quarter is 378 MB of TSV
 * and building that as one JavaScript string is close to the engine's limit for
 * no benefit.
 */
function aggregate(buf) {
  const byCusip = new Map();
  let start = 0;
  let header = true;

  for (let i = 0; i < buf.length; i++) {
    if (buf[i] !== 0x0a) continue;
    if (header) { header = false; start = i + 1; continue; }

    const f = buf.toString('utf8', start, i).split('\t');
    start = i + 1;
    if (f.length < 10) continue;
    // PUTCALL is set for options. An option position is not ownership.
    if (f[9]) continue;

    const cusip = f[4];
    const value = Number(f[6]);
    const shares = Number(f[7]);
    if (!cusip || !Number.isFinite(value)) continue;
    // SSHPRNAMTTYPE distinguishes shares from principal amount on debt.
    if (f[8] && f[8] !== 'SH') continue;

    const e = byCusip.get(cusip) ?? { name: f[2], value: 0, shares: 0, holders: 0 };
    e.value += value;
    if (Number.isFinite(shares)) e.shares += shares;
    e.holders += 1;
    byCusip.set(cusip, e);
  }
  return byCusip;
}

/* --------------------------------------------------------------- the fetch */

const page = await fetch(INDEX, { headers: UA });
if (!page.ok) throw new Error(`index: HTTP ${page.status}`);
const links = [...(await page.text()).matchAll(/href="(\/files\/structureddata\/data\/form-13f-data-sets\/[^"]+\.zip)"/g)]
  .map((m) => m[1]);
/*
  Two naming schemes live in this directory and they do not sort together.
  Older files are `2013q2_form13f.zip`; newer ones are `01mar2026-31may2026_...`.
  Sorted as text the date-ranged names all land BEFORE the year-quarter ones, so
  "the most recent" silently became "sometime in 2023" — which is how the CUSIP
  map ended up built from a two-year-old filing.
*/
const MONTHS = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };
function startsOn(file) {
  const yq = file.match(/^(\d{4})q(\d)/);
  if (yq) return Number(yq[1]) * 12 + (Number(yq[2]) - 1) * 3;
  const range = file.match(/^\d{2}([a-z]{3})(\d{4})-/);
  if (range) return Number(range[2]) * 12 + MONTHS[range[1]];
  return Infinity; // unknown shape sorts last rather than crashing the run
}

const unique = [...new Set(links)]
  .sort((a, b) => startsOn(path.basename(a)) - startsOn(path.basename(b)));
console.log(`13f: ${unique.length} quarterly datasets listed, ` +
  `${path.basename(unique[0]).replace('_form13f.zip', '')} to ` +
  `${path.basename(unique[unique.length - 1]).replace('_form13f.zip', '')}`);

let mapping = null;
const quarters = [];

/*
  Newest first, so the CUSIP map is built from the most recent filing — the one
  whose issuer names match today's constituent list best — and then applied
  backwards over the history.
*/
const order = [...unique].reverse().slice(0, Number.isFinite(LIMIT) ? LIMIT : undefined);

for (const link of order) {
  const label = path.basename(link).replace('_form13f.zip', '');
  const cache = path.join(DIR, `${label}.json`);

  if (existsSync(cache)) {
    quarters.push(JSON.parse(readFileSync(cache, 'utf8')));
    continue;
  }

  const res = await fetch(`https://www.sec.gov${link}`, { headers: UA });
  if (!res.ok) { console.warn(`  ! ${label}: HTTP ${res.status}`); continue; }
  const zip = Buffer.from(await res.arrayBuffer());

  let byCusip;
  try {
    byCusip = aggregate(extract(zip, 'INFOTABLE.tsv'));
  } catch (error) {
    console.warn(`  ! ${label}: ${error.message}`);
    continue;
  }

  /*
    The CUSIP-to-ticker map is built ONCE, from the most recent quarter, and
    reused. CUSIPs do not change; issuer names in older filings are messier, so
    matching against the newest list gives the best join and applies it
    consistently across the whole history.
  */
  if (!mapping) {
    const candidates = [...byCusip.entries()].map(([cusip, e]) => ({ cusip, name: e.name, value: e.value, t: tokens(e.name) }));
    mapping = new Map();
    let matched = 0;
    const names = universe();
    for (const u of names) {
      const ut = tokens(u.name);
      if (!ut.length) continue;
      /*
        A SINGLE-TOKEN NAME MUST MATCH EXACTLY.

        "Aon" is one token, and A-O-N is a subsequence of AMAZON. "APA" is a
        subsequence of ALPHABET. With only one token there is nothing else in
        the name to anchor the match, so the abbreviation rule that correctly
        joins MATLS to MATERIALS quietly bound two mid-caps to two of the
        largest companies in the index — $891B of "Aon" was Amazon.

        Multi-token names keep the loose rule, because their other tokens have
        to match too.
      */
      const exactOnly = ut.length === 1;

      let best = null;
      let bestScore = 0;
      for (const c of candidates) {
        if (!c.t.length) continue;
        let m = 0;
        for (const a of ut) if (c.t.some((b) => (exactOnly ? a === b : alike(a, b)))) m += 1;
        const score = m / ut.length;
        if (score > bestScore || (score === bestScore && best && c.value > best.value)) {
          bestScore = score; best = c;
        }
      }
      // Every token of our name must be accounted for. Anything less is dropped.
      if (bestScore >= 0.999 && best) { mapping.set(best.cusip, u.symbol); matched += 1; }
    }
    console.log(`13f: CUSIP map built from ${label} — ${matched}/${names.length} names matched (${(matched / names.length * 100).toFixed(1)}%)`);
  }

  const holdings = {};
  for (const [cusip, e] of byCusip) {
    const symbol = mapping.get(cusip);
    if (!symbol) continue;
    /*
      VALUE IS NOT COMPARABLE ACROSS THE HISTORY and is kept only for reference.

      The SEC changed 13F from reporting thousands to whole dollars, and the
      implied price per share does not reconcile against actual prices on either
      side of that change. Rather than guess a scale factor, features are built
      from SHARES and HOLDERS — both plain counts, both unit-free, and both a
      more direct statement of who is accumulating than a dollar total is.
    */
    holdings[symbol] = { value: e.value, shares: e.shares, holders: e.holders };
  }

  const record = { quarter: label, names: Object.keys(holdings).length, holdings };
  writeFileSync(cache, `${JSON.stringify(record)}\n`);
  quarters.push(record);
  console.log(`  ${label}  ${record.names} of our names, ${byCusip.size.toLocaleString()} CUSIPs in the filing`);
}

quarters.sort((a, b) => startsOn(a.quarter) - startsOn(b.quarter));
writeFileSync(OUT, `${JSON.stringify({
  fetchedAt: new Date().toISOString(),
  source: INDEX,
  quarters,
})}\n`);

const bytes = readFileSync(OUT).length;
console.log(`13f: ${quarters.length} quarters, ${(bytes / 1048576).toFixed(1)} MB to data/13f.json`);
