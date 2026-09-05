#!/usr/bin/env node
/**
 * EARNINGS PRESS RELEASES, AS TEXT.
 *
 * When a company reports, it files an 8-K tagged item 2.02 — "Results of
 * Operations and Financial Condition" — with the press release attached as
 * EX-99.1. It is the same text that goes on the investor-relations site, but
 * filed, timestamped, and uniform across five hundred companies.
 *
 * ---
 * WHY TEXT AT ALL
 *
 * Every other family here is a number somebody else computed. This is the one
 * place a company describes its own quarter in its own words, and the words
 * carry things the numbers do not: whether guidance was raised or withdrawn,
 * whether the tone shifted from the last quarter, how much hedging surrounds
 * the outlook.
 *
 * ---
 * WHY 8-K ITEM 2.02 AND NOT THE 10-Q
 *
 * The 10-Q is the audited quarter and arrives weeks later. The 8-K is the
 * release itself, filed the same day the market sees it, and item 2.02 is how
 * the SEC tags exactly that. Anything the market reacted to is in here at the
 * moment it reacted.
 *
 * ---
 * THE COST, STATED UP FRONT
 *
 * One submissions API call per company, then one fetch per earnings filing.
 * Roughly 500 companies x 40 quarters is 20,000 documents, and the SEC asks for
 * 10 requests a second. That is a long fetch and the reason it caches per
 * company and can be interrupted and resumed.
 *
 * Run: node scripts/fetch-earnings.mjs               (all of them)
 *      node scripts/fetch-earnings.mjs --limit=10    (a few, to try it)
 *      node scripts/fetch-earnings.mjs --years=6     (how far back)
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { tone, hedging, guidance } from '../src/lib/engine/language.ts';

const ROOT = path.join(import.meta.dirname, '..');
const DIR = path.join(ROOT, 'data', 'earnings');
const OUT = path.join(ROOT, 'data', 'earnings.json');
const UA = { 'User-Agent': 'seventeen-studios-research/1.0 (patelrutvik1702@gmail.com)' };

const flag = (name, fallback) => {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? Number(hit.slice(name.length + 3)) : fallback;
};
const LIMIT = flag('limit', Infinity);
const YEARS = flag('years', 8);
const FROM = `${new Date().getUTCFullYear() - YEARS}-01-01`;

mkdirSync(DIR, { recursive: true });

/* The SEC asks for no more than 10 requests a second. */
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const PAUSE = 110;

function universe() {
  const dir = path.join(ROOT, 'archive', 'constituents');
  const latest = readdirSync(dir).filter((f) => f.endsWith('.csv')).sort().pop();
  return readFileSync(path.join(dir, latest), 'utf8').trim().split('\n').slice(1)
    .map((r) => {
      const m = r.match(/^([^,]+),([^,]*),"([^"]*)"/);
      return m && m[2] ? { symbol: m[1], cik: m[2].replace(/^0+/, '') } : null;
    })
    .filter(Boolean);
}

/**
 * The press release out of a complete submission file.
 *
 * The `.txt` is every exhibit concatenated with SGML headers, which is one
 * request instead of a directory listing plus a document fetch — and the
 * directory listing is mostly EDGAR's own navigation chrome anyway.
 *
 * EX-99.1 is the release by long convention. EX-99.2, where it exists, is
 * usually the CFO commentary; it is kept separately rather than concatenated,
 * because the two have different registers and mixing them would blur exactly
 * the tone comparison this is for.
 */
function exhibits(submission) {
  const out = {};
  for (const m of submission.matchAll(/<TYPE>(EX-99\.[12])[\s\S]*?<TEXT>([\s\S]*?)<\/TEXT>/g)) {
    const text = m[2]
      // Tables are numbers already in the fundamentals; stripping them keeps
      // the text about language rather than about the income statement.
      .replace(/<table[\s\S]*?<\/table>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&#8217;|&rsquo;/g, "'")
      .replace(/&#8220;|&#8221;|&ldquo;|&rdquo;/g, '"')
      .replace(/&nbsp;|&#160;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&#\d+;/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (text.length > 400) out[m[1]] = text;
  }
  return out;
}

const names = universe();
const targets = names.slice(0, Number.isFinite(LIMIT) ? LIMIT : undefined);
console.log(`earnings: ${targets.length} companies, filings since ${FROM}`);

let fetched = 0;
let cached = 0;
const all = [];

for (const [i, company] of targets.entries()) {
  const cacheFile = path.join(DIR, `${company.symbol}.json`);
  if (existsSync(cacheFile)) {
    all.push(...JSON.parse(readFileSync(cacheFile, 'utf8')).releases);
    cached += 1;
    continue;
  }

  let submissions;
  try {
    const res = await fetch(`https://data.sec.gov/submissions/CIK${company.cik.padStart(10, '0')}.json`, { headers: UA });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    submissions = await res.json();
  } catch (error) {
    console.warn(`  ! ${company.symbol}: ${error.message}`);
    continue;
  }
  await sleep(PAUSE);

  /*
    Only the recent block is read. The archived files reach back to 1998, and
    the backtest starts in 2013 — but the recent block already holds a thousand
    filings, which for most companies is a decade. Paging further is a lot of
    requests for years the model will never see.
  */
  const r = submissions.filings?.recent;
  if (!r) { console.warn(`  ! ${company.symbol}: no filings block`); continue; }

  const wanted = [];
  for (let k = 0; k < r.form.length; k++) {
    if (r.form[k] !== '8-K') continue;
    if (!(r.items?.[k] ?? '').includes('2.02')) continue;
    if (r.filingDate[k] < FROM) continue;
    wanted.push({ date: r.filingDate[k], accession: r.accessionNumber[k] });
  }

  const releases = [];
  for (const w of wanted) {
    const bare = w.accession.replace(/-/g, '');
    const url = `https://www.sec.gov/Archives/edgar/data/${company.cik}/${bare}/${w.accession}.txt`;
    try {
      const res = await fetch(url, { headers: UA });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const ex = exhibits(await res.text());
      if (ex['EX-99.1']) {
        releases.push({
          symbol: company.symbol,
          date: w.date,
          release: ex['EX-99.1'],
          commentary: ex['EX-99.2'] ?? null,
        });
      }
    } catch (error) {
      console.warn(`  ! ${company.symbol} ${w.date}: ${error.message}`);
    }
    await sleep(PAUSE);
  }

  writeFileSync(cacheFile, `${JSON.stringify({ symbol: company.symbol, releases })}\n`);
  all.push(...releases);
  fetched += 1;

  if ((i + 1) % 10 === 0 || releases.length) {
    console.log(`  ${company.symbol.padEnd(6)} ${String(releases.length).padStart(3)} releases   (${i + 1}/${targets.length})`);
  }
}

/*
  THE SHIPPED FILE HOLDS SCORES, NOT TEXT.

  14,065 releases are 658 MB of prose, and `JSON.stringify` on that throws
  RangeError before it finishes — V8 cannot build a string that long. That was
  the first version's failure and it was the right failure to have: the features
  need seven numbers per release, not the words they came from.

  The raw text stays cached per company in `data/earnings/`, so changing the
  dictionary means re-scoring rather than re-fetching 658 MB.
*/
all.sort((a, b) => (a.date < b.date ? -1 : 1));
const scored = all.map((r) => ({
  symbol: r.symbol,
  date: r.date,
  tone: +tone(r.release).toFixed(3),
  hedging: +hedging(r.release).toFixed(3),
  guidance: guidance(r.release),
  length: r.release.length,
  hasCommentary: Boolean(r.commentary),
}));

writeFileSync(OUT, `${JSON.stringify({
  fetchedAt: new Date().toISOString(),
  source: 'EDGAR 8-K item 2.02, exhibit EX-99.1',
  from: FROM,
  note: 'Scores, not text. The prose is cached per company in data/earnings/ — re-score from there if the dictionary changes.',
  releases: scored,
})}\n`);

const bytes = readFileSync(OUT).length;
const withCommentary = all.filter((x) => x.commentary).length;
console.log('');
console.log(`earnings: ${all.length.toLocaleString()} releases from ${new Set(all.map((r) => r.symbol)).size} companies`);
console.log(`earnings: ${withCommentary.toLocaleString()} also carry CFO commentary`);
console.log(`earnings: ${fetched} fetched, ${cached} from cache, ${(bytes / 1048576).toFixed(1)} MB`);
