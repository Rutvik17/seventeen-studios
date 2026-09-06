#!/usr/bin/env node
/**
 * WHO IN THE INDEX OWNS WHOM.
 *
 * ---
 * THE QUESTION
 *
 * NVIDIA's own 13F reports tens of billions of dollars of stock in Intel,
 * CoreWeave, Coherent and Synopsys — companies that are also its customers or
 * suppliers. That is a real structure and a distinctive one: a chip maker
 * funding the businesses that buy its chips. Revenue that returns as an equity
 * stake, and an equity stake that funds the next order.
 *
 * It is not fraud and nobody claims it is. It IS a reason to think a company's
 * reported growth and its balance sheet are less independent than they look —
 * and that is the kind of thing a model built from price and margins cannot
 * see, because it is a fact about the GRAPH rather than about either node.
 *
 * ---
 * WHY THIS READS EDGAR DIRECTLY AND NOT THE BULK 13F DATASETS
 *
 * It used to read the quarterly bulk zips, which is the obvious source and is
 * a full quarter behind. The SEC publishes those files well after the filing
 * window closes: in September 2026 the newest was `01mar2026-31may2026`, whose
 * latest reportable period is 31 March. The individual filings do not lag —
 * they are on EDGAR the day they are filed.
 *
 * That gap was not cosmetic. Between March and June 2026 Alphabet's 13F went
 * from no position in SpaceX to $94.18B of it, its largest holding by a factor
 * of eighty, and NVIDIA's went to $20.98B. Neither is anywhere in the bulk
 * file, so a page built on it was not slightly out of date — it was missing
 * the single biggest thing in the dataset.
 *
 * So: enumerate every operating member of the index, ask EDGAR what each one
 * filed, and read the filings.
 *
 * ---
 * WHY IT ENUMERATES RATHER THAN LOOKING FOR ANYTHING
 *
 * Nothing here knows what a SpaceX is. The completeness comes from asking
 * every company in the universe what it holds and recording whatever comes
 * back. A named exception would fix the one case somebody noticed and leave
 * the next one to be noticed by somebody else. The run prints its own
 * coverage — members, filers, periods, tables — so a gap is visible rather
 * than assumed away.
 *
 * Run: node scripts/fetch-circular.mjs [--periods=4]
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.join(import.meta.dirname, '..');
const OUT = path.join(ROOT, 'data', 'circular.json');
const CACHE = path.join(ROOT, 'data', 'cache', 'edgar');
const UA = { 'User-Agent': 'seventeen-studios-research/1.0 (patelrutvik1702@gmail.com)' };

/* How many report periods back to keep. The graph is a structure, but a stake
   with no previous quarter cannot be shown moving. */
const PERIODS = Number((process.argv.find((a) => a.startsWith('--periods=')) ?? '').slice(10)) || 4;

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
  return { snapshot: latest.replace('.csv', ''), members: out };
}

/* ------------------------------------------------------------------ EDGAR */

/*
  The SEC asks for no more than ten requests a second and a User-Agent that
  identifies the caller. Both are honoured: no request is issued within 120ms
  of the previous one, so the whole run is serial and polite rather than fast
  and blocked.
*/
let lastCall = 0;
async function polite(url, { json = true } = {}) {
  const wait = 120 - (Date.now() - lastCall);
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastCall = Date.now();
  const res = await fetch(url, { headers: UA });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return json ? res.json() : res.text();
}

/*
  Submissions are cached on disk. A company's filing list changes only when it
  files, so a re-run should not spend 450 requests learning that 429 of them
  still do not file a 13F.
*/
async function submissions(cik) {
  mkdirSync(CACHE, { recursive: true });
  const at = path.join(CACHE, `sub-${cik}.json`);
  if (existsSync(at)) {
    const cached = JSON.parse(readFileSync(at, 'utf8'));
    if (Date.now() - Date.parse(cached.cachedAt) < 6 * 3600e3) return cached.body;
  }
  const body = await polite(`https://data.sec.gov/submissions/CIK${String(cik).padStart(10, '0')}.json`);
  writeFileSync(at, JSON.stringify({ cachedAt: new Date().toISOString(), body }));
  return body;
}

/**
 * The 13F-HR filings a company has on file, newest period first.
 *
 * An amendment supersedes: 13F-HR/A carries the same reportDate as the filing
 * it corrects, so the newest FILING for a period wins and the original is
 * dropped. Notices (13F-NT) report that holdings appear on someone else's
 * filing and carry no table of their own.
 */
function reports(sub) {
  const r = sub?.filings?.recent;
  if (!r?.form) return [];
  const best = new Map();
  for (let i = 0; i < r.form.length; i++) {
    if (!r.form[i].startsWith('13F-HR')) continue;
    const period = r.reportDate[i];
    const cur = best.get(period);
    if (!cur || r.filingDate[i] > cur.filed) {
      best.set(period, {
        period,
        filed: r.filingDate[i],
        form: r.form[i],
        accession: r.accessionNumber[i].replace(/-/g, ''),
      });
    }
  }
  return [...best.values()].sort((a, b) => (a.period < b.period ? 1 : -1));
}

/**
 * The holdings table inside one filing.
 *
 * The document is not always called `information_table.xml` — filers name it
 * what they like — so it is chosen from the filing's own index by elimination
 * rather than by a guessed filename.
 */
async function holdings(cik, accession) {
  const base = `https://www.sec.gov/Archives/edgar/data/${cik}/${accession}`;
  const index = await polite(`${base}/index.json`);
  const files = index.directory.item.map((i) => i.name);
  const table =
    files.find((f) => /information[_-]?table.*\.xml$/i.test(f))
    ?? files.find((f) => /\.xml$/i.test(f) && !/primary[_-]?doc/i.test(f));
  if (!table) return [];

  const xml = await polite(`${base}/${table}`, { json: false });
  const field = (block, tag) => {
    const m = block.match(new RegExp(`<(?:\\w+:)?${tag}>([^<]*)<`));
    return m ? m[1].trim() : '';
  };

  const out = [];
  for (const [, block] of xml.matchAll(/<(?:\w+:)?infoTable>([\s\S]*?)<\/(?:\w+:)?infoTable>/g)) {
    /* An option is a hedge or a financing structure, not a stake in a company. */
    if (field(block, 'putCall')) continue;
    const value = Number(field(block, 'value'));
    if (!Number.isFinite(value) || value <= 0) continue;
    out.push({
      name: field(block, 'nameOfIssuer'),
      cusip: field(block, 'cusip'),
      value,
      shares: Number(field(block, 'sshPrnamt')) || 0,
    });
  }
  return out;
}

/* ---------------------------------------------------------------- the run */

/** `2026-03-31` to `31-MAR-2026` — the shape the engine features already parse. */
const MONTH3 = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const secDate = (iso) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso ?? '');
  return m ? `${m[3]}-${MONTH3[Number(m[2]) - 1]}-${m[1]}` : iso;
};

const { snapshot, members } = universe();
const operating = members.filter((n) => n.cik && n.sector !== EXCLUDED_SECTOR);
console.log(`circular: ${operating.length} non-financial members of the ${snapshot} index, of ${members.length}`);
console.log('circular: asking EDGAR what each one filed…');

const filers = [];
let asked = 0;
for (const member of operating) {
  asked += 1;
  if (asked % 100 === 0) console.log(`  …${asked}/${operating.length}`);
  let sub;
  try {
    sub = await submissions(member.cik);
  } catch (err) {
    console.warn(`  ! ${member.symbol}: ${err.message}`);
    continue;
  }
  const filings = reports(sub);
  if (filings.length) filers.push({ member, filer: sub.name ?? member.name, filings });
}

/*
  ONE FILER PER COMPANY, NOT PER TICKER.

  A company with two share classes sits in the index twice — Alphabet as GOOG
  and GOOGL — and both rows carry the same CIK, so both resolve to the same
  13F and the same holdings get recorded twice. Left in, Alphabet's $94.18B
  stake in SpaceX appeared as two $94.18B stakes and the graph's total was
  overstated by the size of its largest company.

  The filing belongs to the CIK. The lower ticker is kept because it has to be
  one of them and that is a rule rather than a preference; the others are
  recorded as aliases so the collapse is visible in the output.
*/
const byCik = new Map();
for (const f of filers.sort((a, b) => (a.member.symbol < b.member.symbol ? -1 : 1))) {
  const cur = byCik.get(f.member.cik);
  if (cur) cur.aliases.push(f.member.symbol);
  else byCik.set(f.member.cik, { ...f, aliases: [] });
}
const unique = [...byCik.values()];
const collapsed = unique.filter((f) => f.aliases.length);

console.log(`circular: ${filers.length} of them file a 13F at all`);
if (collapsed.length) {
  console.log(`circular: ${collapsed.length} collapsed to one filer per company — `
    + collapsed.map((f) => `${f.member.symbol} absorbs ${f.aliases.join(', ')}`).join('; '));
}
console.log('');

const edges = new Map();
const periods = new Set();
let tables = 0;

for (const { member, filer, filings, aliases } of unique) {
  const seen = [];
  for (const f of filings.slice(0, PERIODS)) {
    let rows;
    try {
      rows = await holdings(member.cik, f.accession);
    } catch (err) {
      console.warn(`  ! ${member.symbol} ${f.period}: ${err.message}`);
      continue;
    }
    tables += 1;
    periods.add(f.period);

    for (const h of rows) {
      /*
        Keyed by CUSIP, not by issuer name: the same security is spelled
        differently by different filers and sometimes by the same filer across
        quarters. Summed, because one filer may list a holding on several rows
        for several managers, and those are one position.
      */
      const key = `${f.period}|${member.symbol}|${h.cusip}`;
      const e = edges.get(key) ?? {
        from: member.symbol,
        fromName: member.name,
        /* Other tickers of the same company, so a reader searching GOOGL finds it. */
        alsoTrades: aliases,
        filer,
        to: h.name,
        cusip: h.cusip,
        value: 0,
        shares: 0,
        period: secDate(f.period),
        periodIso: f.period,
        filed: f.filed,
        amended: f.form.includes('/A'),
      };
      e.value += h.value;
      e.shares += h.shares;
      edges.set(key, e);
    }
    seen.push(`${f.period}${f.form.includes('/A') ? '*' : ''}:${rows.length}`);
  }
  if (seen.length) {
    const label = aliases.length ? `${member.symbol}/${aliases.join('/')}` : member.symbol;
    console.log(`  ${label.padEnd(11)} ${filer.slice(0, 30).padEnd(32)} ${seen.join('  ')}`);
  }
}

const list = [...edges.values()].sort((a, b) => b.value - a.value);
const newest = [...periods].sort().pop() ?? null;
const inNewest = list.filter((e) => e.periodIso === newest);

mkdirSync(path.dirname(OUT), { recursive: true });
writeFileSync(OUT, `${JSON.stringify({
  fetchedAt: new Date().toISOString(),
  source: 'EDGAR 13F-HR filings, read per filer',
  universe: snapshot,
  operatingMembers: operating.length,
  filersFound: unique.length,
  tickersFiling: filers.length,
  periods: [...periods].sort(),
  latestPeriod: newest,
  note:
    'Equity stakes held BY non-financial S&P 500 companies, from their own 13F-HR filings on EDGAR. '
    + 'Read per filer rather than from the quarterly bulk datasets, which lag a full period. '
    + 'Financials are excluded by SECTOR: a fund holding securities is doing its job, and no name rule '
    + 'separates BlackRock from an operating company without catching real ones too. Options are excluded — '
    + 'a put or a call is not a stake. Amendments supersede the filing they correct.',
  edges: list,
})}\n`);

console.log(`\ncircular: ${tables} information tables read across ${periods.size} periods`);
console.log(`circular: ${list.length} stakes total, ${inNewest.length} of them at ${newest}`);
console.log(`circular: newest period is $${(inNewest.reduce((s, e) => s + e.value, 0) / 1e9).toFixed(1)}B across ${new Set(inNewest.map((e) => e.from)).size} companies`);
console.log(`\ncircular: largest at ${newest}`);
for (const e of inNewest.slice(0, 14)) {
  console.log(`  ${e.from.padEnd(6)} -> ${e.to.slice(0, 36).padEnd(38)} $${(e.value / 1e9).toFixed(2)}B`);
}
console.log('\ncircular: wrote data/circular.json');
