#!/usr/bin/env node
/**
 * WHO IN THE INDEX OWNS WHOM.
 *
 * ---
 * THE QUESTION
 *
 * NVIDIA's own 13F reports billions of dollars of stock in Intel, CoreWeave,
 * Coherent and Synopsys — companies that are also its customers or suppliers.
 * That is a real structure and a distinctive one: a chip maker funding the
 * businesses that buy its chips. Revenue that returns as an equity stake, and
 * an equity stake that funds the next order.
 *
 * It is not fraud and nobody claims it is. It IS a reason to think a company's
 * reported growth and its balance sheet are less independent than they look —
 * and that is the kind of thing a model built from price and margins cannot
 * see, because it is a fact about the GRAPH rather than about either node.
 *
 * ---
 * WHY THIS IS A SEPARATE PASS OVER THE SAME FILES
 *
 * `fetch-13f.mjs` answers "who owns this stock", so it sums across every
 * manager and throws the filer away. That is right for an ownership feature and
 * useless here: this needs the opposite projection, keyed by FILER, and only
 * for filers that are themselves in the index.
 *
 * The overwhelming majority of 13F filers are asset managers — Vanguard,
 * BlackRock, a thousand hedge funds — and their holdings are portfolio
 * construction rather than industrial strategy. Those are excluded by
 * construction: a filer only counts if it is an S&P 500 OPERATING company, and
 * an operating company holding equity in another operating company is the
 * unusual thing this is looking for.
 *
 * Run: node scripts/fetch-circular.mjs   (uses the cached 13F zips where present)
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { extract } from './_zip.mjs';

const ROOT = path.join(import.meta.dirname, '..');
const OUT = path.join(ROOT, 'data', 'circular.json');
const INDEX = 'https://www.sec.gov/data-research/sec-markets-data/form-13f-data-sets';
const UA = { 'User-Agent': 'seventeen-studios-research/1.0 (patelrutvik1702@gmail.com)' };

/* Only recent quarters: the graph is a structural fact, not a time series. */
const QUARTERS = Number((process.argv.find((a) => a.startsWith('--quarters=')) ?? '').slice(11)) || 4;

/*
  FINANCIALS ARE EXCLUDED BY SECTOR, NOT BY NAME.

  The first attempt filtered asset managers with a name pattern, and the top of
  the result was BlackRock, State Street and Morgan Stanley — all three are S&P
  500 members AND among the largest asset managers on earth. No name rule
  separates them from operating companies without also catching real ones:
  "capital", "global" and "partners" appear in plenty of industrial names.

  Sector does it structurally. A financial firm holding securities is doing its
  job, and that is as true of a regional bank as of BlackRock. What survives is
  a technology company holding equity in another technology company, which is
  the unusual thing this is looking for.

  The cost is that a genuine financial-sector strategic stake becomes invisible.
  That is the right trade: the alternative was a graph whose largest edges were
  index funds.
*/
const EXCLUDED_SECTOR = 'Financials';

/** The index, from the newest constituent snapshot. */
function universe() {
  const dir = path.join(ROOT, 'archive', 'constituents');
  const latest = readdirSync(dir).filter((f) => f.endsWith('.csv')).sort().pop();
  const rows = readFileSync(path.join(dir, latest), 'utf8').trim().split('\n').slice(1);
  const out = [];
  for (const r of rows) {
    const m = r.match(/^([^,]+),([^,]*),"([^"]*)"/);
    const sector = r.match(/,"([^"]+)","[^"]*"\s*$/);
    if (m) out.push({ symbol: m[1], cik: m[2].replace(/^0+/, ''), name: m[3], sector: sector ? sector[1] : '' });
  }
  return out;
}

function rows(buf, wanted) {
  const out = [];
  let start = 0;
  let cols = null;
  for (let i = 0; i < buf.length; i++) {
    if (buf[i] !== 0x0a) continue;
    const line = buf.toString('utf8', start, i);
    start = i + 1;
    if (!cols) {
      const header = line.replace(/\r$/, '').split('\t');
      cols = wanted.map((w) => header.indexOf(w));
      if (cols.some((c) => c < 0)) throw new Error(`missing column in ${wanted.join(',')}`);
      continue;
    }
    const f = line.split('\t');
    const rec = {};
    wanted.forEach((w, k) => { rec[w] = f[cols[k]]; });
    out.push(rec);
  }
  return out;
}

const names = universe();
/*
  CIK is the join, not the name.

  The constituent list carries each company's SEC identifier, and so does every
  13F cover page. Matching on CIK is exact where matching on name would repeat
  the Aon-is-Amazon problem — and here a false match would invent a financial
  relationship between two companies, which is a considerably worse thing to get
  wrong than an ownership count.
*/
const operating = names.filter((n) => n.cik && n.sector !== EXCLUDED_SECTOR);
const byCik = new Map(operating.map((n) => [n.cik, n]));
console.log(`circular: ${byCik.size} non-financial index members with a CIK, of ${names.length}`);

const page = await fetch(INDEX, { headers: UA });
if (!page.ok) throw new Error(`index: HTTP ${page.status}`);
const links = [...new Set(
  [...(await page.text()).matchAll(/href="(\/files\/structureddata\/data\/form-13f-data-sets\/[^"]+\.zip)"/g)]
    .map((m) => m[1]),
)];

/* Newest first: the structure now is what matters, not its history. */
const MONTHS = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };
const startsOn = (file) => {
  const yq = file.match(/^(\d{4})q(\d)/);
  if (yq) return Number(yq[1]) * 12 + (Number(yq[2]) - 1) * 3;
  const r = file.match(/^\d{2}([a-z]{3})(\d{4})-/);
  return r ? Number(r[2]) * 12 + MONTHS[r[1]] : -Infinity;
};
links.sort((a, b) => startsOn(path.basename(b)) - startsOn(path.basename(a)));

const edges = new Map();
let scanned = 0;

for (const link of links.slice(0, QUARTERS)) {
  const label = path.basename(link).replace('_form13f.zip', '');
  const res = await fetch(`https://www.sec.gov${link}`, { headers: UA });
  if (!res.ok) { console.warn(`  ! ${label}: HTTP ${res.status}`); continue; }
  const zip = Buffer.from(await res.arrayBuffer());

  const cover = rows(extract(zip, 'COVERPAGE.tsv'), ['ACCESSION_NUMBER', 'FILINGMANAGER_NAME']);
  const subs = rows(extract(zip, 'SUBMISSION.tsv'), ['ACCESSION_NUMBER', 'CIK', 'PERIODOFREPORT']);

  /* Accessions filed BY an index member that is not an asset manager. */
  const operators = new Map();
  const nameOf = new Map(cover.map((c) => [c.ACCESSION_NUMBER, c.FILINGMANAGER_NAME]));
  for (const s of subs) {
    const member = byCik.get((s.CIK ?? '').replace(/^0+/, ''));
    if (!member) continue;
    const filer = nameOf.get(s.ACCESSION_NUMBER) ?? '';
    operators.set(s.ACCESSION_NUMBER, { ...member, filer, period: s.PERIODOFREPORT });
  }

  if (!operators.size) { console.log(`  ${label}  no operating-company filers`); continue; }

  const info = rows(extract(zip, 'INFOTABLE.tsv'),
    ['ACCESSION_NUMBER', 'NAMEOFISSUER', 'CUSIP', 'VALUE', 'SSHPRNAMT', 'PUTCALL']);

  for (const t of info) {
    const from = operators.get(t.ACCESSION_NUMBER);
    if (!from) continue;
    if (t.PUTCALL) continue; // an option is a hedge, not a stake
    const value = Number(t.VALUE);
    if (!Number.isFinite(value) || value <= 0) continue;

    const key = `${from.symbol}|${t.NAMEOFISSUER}`;
    const e = edges.get(key) ?? {
      from: from.symbol, fromName: from.name, filer: from.filer,
      to: t.NAMEOFISSUER, cusip: t.CUSIP, value: 0, period: from.period,
    };
    e.value += value;
    if (from.period > e.period) e.period = from.period;
    edges.set(key, e);
  }

  scanned += 1;
  console.log(`  ${label}  ${operators.size} operating-company filings`);
}

const list = [...edges.values()].sort((a, b) => b.value - a.value);
mkdirSync(path.dirname(OUT), { recursive: true });
writeFileSync(OUT, `${JSON.stringify({
  fetchedAt: new Date().toISOString(),
  source: INDEX,
  quartersScanned: scanned,
  note: 'Equity stakes held BY non-financial S&P 500 companies, from their own 13F filings. Financials are excluded by SECTOR: a fund holding securities is doing its job, and no name rule separates BlackRock from an operating company without catching real ones too.',
  edges: list,
})}\n`);

console.log('');
console.log(`circular: ${list.length} stakes held by ${new Set(list.map((e) => e.from)).size} operating companies`);
for (const e of list.slice(0, 12)) {
  console.log(`  ${e.from.padEnd(6)} -> ${e.to.slice(0, 34).padEnd(34)} $${(e.value / 1e9).toFixed(2)}B`);
}
console.log(`circular: wrote data/circular.json`);
