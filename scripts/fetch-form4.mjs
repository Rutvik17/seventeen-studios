#!/usr/bin/env node
/**
 * INSIDER TRANSACTIONS, FROM FORM 4.
 *
 * Officers, directors and 10% owners must report every trade in their own
 * company within two business days. It is the only dataset in this project
 * where someone with a legal duty to know the business puts their own money on
 * a view — and the two-day deadline makes it the freshest thing here by a wide
 * margin. A 13F is 45 days stale before it is usable; a Form 4 is two days.
 *
 * ---
 * WHY THIS IS EASIER THAN 13F WAS
 *
 * SUBMISSION.tsv carries ISSUERTRADINGSYMBOL, so there is no CUSIP to join by
 * name and none of the fuzzy matching that made Aon into Amazon. It also
 * carries FILING_DATE per accession, so availability is a fact in the file
 * rather than a statute to reason about.
 *
 * ---
 * MOST TRANSACTIONS ARE NOT DECISIONS
 *
 * The single most common code in a quarter is F — shares withheld to pay tax
 * on a vesting grant — followed by A, the grant itself. Neither is a view about
 * anything: an executive being paid in stock has expressed no opinion, and
 * neither has one whose employer withheld shares to settle the bill.
 *
 * Only P and S are open-market decisions with the insider's own money:
 *
 *     P/A   open-market purchase        5,921 in 2026q1
 *     S/D   open-market sale           22,794
 *     A/A   grant or award             24,635   ignored
 *     F/D   tax withholding            27,002   ignored
 *     M/A   option exercise            16,246   ignored
 *
 * Counting all of them together would make "insider activity" mostly a measure
 * of how a company structures its compensation, which is a fact about the HR
 * department rather than about the stock.
 *
 * Run: node scripts/fetch-form4.mjs        (cached per quarter)
 *      node scripts/fetch-form4.mjs --limit=4
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { extract } from './_zip.mjs';

const ROOT = path.join(import.meta.dirname, '..');
const DIR = path.join(ROOT, 'data', 'form4');
const OUT = path.join(ROOT, 'data', 'form4.json');
const INDEX = 'https://www.sec.gov/data-research/sec-markets-data/insider-transactions-data-sets';

const UA = { 'User-Agent': 'seventeen-studios-research/1.0 (patelrutvik1702@gmail.com)' };

const limitFlag = process.argv.find((a) => a.startsWith('--limit='));
const LIMIT = limitFlag ? Number(limitFlag.slice(8)) : Infinity;
/* Nothing before the backtest starts is any use, and it is 20 extra downloads. */
const FROM = '2012';

mkdirSync(DIR, { recursive: true });

const MONTH3 = { JAN: '01', FEB: '02', MAR: '03', APR: '04', MAY: '05', JUN: '06',
  JUL: '07', AUG: '08', SEP: '09', OCT: '10', NOV: '11', DEC: '12' };
function isoDate(sec) {
  const m = /^(\d{2})-([A-Z]{3})-(\d{4})$/.exec((sec ?? '').trim().toUpperCase());
  return m ? `${m[3]}-${MONTH3[m[2]]}-${m[1]}` : null;
}

/** A TSV as rows of objects, walked as bytes to avoid a 40 MB string. */
function rows(buf, wanted) {
  const out = [];
  let start = 0;
  let cols = null;
  const want = new Set(wanted);

  for (let i = 0; i < buf.length; i++) {
    if (buf[i] !== 0x0a) continue;
    const line = buf.toString('utf8', start, i);
    start = i + 1;

    if (!cols) {
      const header = line.replace(/\r$/, '').split('\t');
      cols = wanted.map((w) => header.indexOf(w));
      const missing = wanted.filter((w, k) => cols[k] < 0);
      if (missing.length) throw new Error(`missing column(s): ${missing.join(', ')}`);
      continue;
    }

    const f = line.split('\t');
    const rec = {};
    wanted.forEach((w, k) => { rec[w] = f[cols[k]]; });
    out.push(rec);
  }
  return out;
}

/*
  Roles that matter, ranked — and the top of the ladder is separated out.

  A first attempt gave every officer a weight of 1, which made the weighted
  column identical to `buyers - sellers` on 89% of rows: officers dominate the
  filings, so a weight of exactly 1 collapsed into the count and the feature
  carried nothing the count did not.

  The distinction the literature actually supports is narrower than
  officer-versus-director. A CEO or CFO buying is the strongest version of this
  signal — they see the numbers first and have the least excuse for being wrong
  — so they sit above other officers rather than beside them.

  RPTOWNER_RELATIONSHIP is a comma-joined set: "Director,Officer" is common, and
  the strongest role in it wins.
*/
function roleWeight(relationship, title) {
  const r = `${relationship ?? ''} ${title ?? ''}`.toLowerCase();
  if (/ceo|chief executive|cfo|chief financial|president/.test(r)) return 1;
  if (/officer|chief|coo|cto/.test(r)) return 0.7;
  if (/director/.test(r)) return 0.45;
  // A 10% holder is usually a fund rebalancing rather than someone with a view.
  return 0.2;
}

const page = await fetch(INDEX, { headers: UA });
if (!page.ok) throw new Error(`index: HTTP ${page.status}`);
const links = [...new Set(
  [...(await page.text()).matchAll(/href="(\/files\/[^"]*insider-transactions-data-sets\/(\d{4})q\d_form345\.zip)"/g)]
    .filter((m) => m[2] >= FROM)
    .map((m) => m[1]),
)].sort();

console.log(`form4: ${links.length} quarterly datasets from ${FROM}`);

const quarters = [];
const order = links.slice().reverse().slice(0, Number.isFinite(LIMIT) ? LIMIT : undefined);

for (const link of order) {
  const label = path.basename(link).replace('_form345.zip', '');
  const cache = path.join(DIR, `${label}.json`);

  if (existsSync(cache)) { quarters.push(JSON.parse(readFileSync(cache, 'utf8'))); continue; }

  const res = await fetch(`https://www.sec.gov${link}`, { headers: UA });
  if (!res.ok) { console.warn(`  ! ${label}: HTTP ${res.status}`); continue; }
  const zip = Buffer.from(await res.arrayBuffer());

  let subs;
  let owners;
  let trans;
  try {
    subs = rows(extract(zip, 'SUBMISSION.tsv'),
      ['ACCESSION_NUMBER', 'FILING_DATE', 'ISSUERTRADINGSYMBOL', 'DOCUMENT_TYPE']);
    owners = rows(extract(zip, 'REPORTINGOWNER.tsv'),
      ['ACCESSION_NUMBER', 'RPTOWNERCIK', 'RPTOWNER_RELATIONSHIP', 'RPTOWNER_TITLE']);
    trans = rows(extract(zip, 'NONDERIV_TRANS.tsv'),
      ['ACCESSION_NUMBER', 'TRANS_DATE', 'TRANS_CODE', 'TRANS_SHARES',
        'TRANS_PRICEPERSHARE', 'TRANS_ACQUIRED_DISP_CD']);
  } catch (error) {
    console.warn(`  ! ${label}: ${error.message}`);
    continue;
  }

  const submission = new Map();
  for (const s of subs) {
    // Form 4 only. Form 3 is an initial statement of holdings and Form 5 is an
    // annual catch-up of things that were exempt; neither is a fresh decision.
    if (s.DOCUMENT_TYPE !== '4') continue;
    const symbol = (s.ISSUERTRADINGSYMBOL ?? '').trim().toUpperCase();
    const filed = isoDate(s.FILING_DATE);
    if (!symbol || !filed || symbol === 'NONE') continue;
    submission.set(s.ACCESSION_NUMBER, { symbol, filed });
  }

  const role = new Map();
  for (const o of owners) {
    const w = roleWeight(o.RPTOWNER_RELATIONSHIP, o.RPTOWNER_TITLE);
    // A filing can list several owners; the most senior one characterises it.
    role.set(o.ACCESSION_NUMBER, Math.max(role.get(o.ACCESSION_NUMBER) ?? 0, w));
  }

  /*
    Aggregated by SYMBOL and FILING DATE, not transaction date.

    The filing date is when the market could see it. A purchase made on Monday
    and filed on Wednesday is not information on Monday, and keying by
    transaction date would hand the model two days of hindsight on every row.
  */
  const byDay = new Map();
  for (const t of trans) {
    const sub = submission.get(t.ACCESSION_NUMBER);
    if (!sub) continue;

    const code = t.TRANS_CODE;
    if (code !== 'P' && code !== 'S') continue;

    const shares = Number(t.TRANS_SHARES);
    const price = Number(t.TRANS_PRICEPERSHARE);
    if (!Number.isFinite(shares) || shares <= 0) continue;
    // A P or S without a price is a reporting artefact, not a trade we can value.
    if (!Number.isFinite(price) || price <= 0) continue;
    /*
      FILERS MAKE TYPOS AND THE SEC PUBLISHES THEM.

      REEMF has two Form 4s reporting a purchase at $24,035,774.40 per share,
      which came out as a $2.4 QUADRILLION buy and would have been the largest
      insider purchase in the dataset by eleven orders of magnitude. It is a
      decimal error in somebody's filing, not a trade.

      $100,000 a share is far above any real US common stock — Berkshire A, the
      most expensive, trades near $700,000, and it does not appear in this
      universe. Anything past that is a data-entry mistake and is dropped rather
      than winsorised, because there is no correct value to clamp it to.
    */
    if (price > 100_000) continue;

    const key = `${sub.symbol} ${sub.filed}`;
    const e = byDay.get(key) ?? {
      symbol: sub.symbol, date: sub.filed,
      buyValue: 0, sellValue: 0, buyers: new Set(), sellers: new Set(), weight: 0,
    };
    const w = role.get(t.ACCESSION_NUMBER) ?? 0.3;
    const value = shares * price;

    if (code === 'P') { e.buyValue += value; e.buyers.add(t.ACCESSION_NUMBER); e.weight += w; }
    else { e.sellValue += value; e.sellers.add(t.ACCESSION_NUMBER); e.weight -= w; }
    byDay.set(key, e);
  }

  const events = [...byDay.values()].map((e) => {
    // One contribution per FILING, positive for buyers and negative for sellers.
    let weight = 0;
    for (const a of e.buyers) weight += role.get(a) ?? 0.3;
    for (const a of e.sellers) weight -= role.get(a) ?? 0.3;
    return {
      symbol: e.symbol,
      date: e.date,
      buy: Math.round(e.buyValue),
      sell: Math.round(e.sellValue),
      buyers: e.buyers.size,
      sellers: e.sellers.size,
      weight: +weight.toFixed(2),
    };
  });

  const record = { quarter: label, events };
  writeFileSync(cache, `${JSON.stringify(record)}\n`);
  quarters.push(record);
  const buys = events.reduce((s, e) => s + e.buyers, 0);
  const sells = events.reduce((s, e) => s + e.sellers, 0);
  console.log(`  ${label}  ${events.length.toLocaleString()} symbol-days, ${buys.toLocaleString()} buys, ${sells.toLocaleString()} sells`);
}

quarters.sort((a, b) => (a.quarter < b.quarter ? -1 : 1));
const events = quarters.flatMap((q) => q.events).sort((a, b) => (a.date < b.date ? -1 : 1));

writeFileSync(OUT, `${JSON.stringify({
  fetchedAt: new Date().toISOString(),
  source: INDEX,
  note: 'Open-market purchases (P) and sales (S) only, keyed by FILING date because that is when the market could see them. Grants, tax withholding and option exercises are excluded — they are compensation, not decisions.',
  events,
})}\n`);

const bytes = readFileSync(OUT).length;
console.log(`form4: ${events.length.toLocaleString()} symbol-days, ${events[0]?.date} to ${events.at(-1)?.date}`);
console.log(`form4: ${(bytes / 1048576).toFixed(1)} MB to data/form4.json`);
