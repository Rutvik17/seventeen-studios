#!/usr/bin/env node
/**
 * WHICH EQUITY STAKES ARE ALSO A COMMERCIAL RELATIONSHIP.
 *
 * ---
 * THE DISTINCTION THIS EXISTS TO DRAW
 *
 * `fetch-circular.mjs` collects every stake one index company holds in another
 * listed company. Most of those are ordinary corporate investment: Ventas owns
 * a REIT, Lennar owns a homebuilding supplier, Uber owns Grab because it sold
 * it a business.
 *
 * A few are something else — the investor is also the investee's supplier or
 * its customer, so money leaves as equity and comes back as revenue. NVIDIA
 * funding CoreWeave, which buys NVIDIA GPUs. Amazon funding Rivian, which
 * sells Amazon vans. That is the structure people mean by "circular
 * financing", and it is not visible in a 13F: the filing establishes the
 * stake and says nothing about whether the two companies trade with each
 * other.
 *
 * ---
 * WHY EVIDENCE RATHER THAN A RULE
 *
 * Every rule considered here was a proxy that would have been wrong. Same
 * sector catches Gilead and Arcus (a real licensing loop) but also catches
 * Merck's ordinary biotech portfolio. Stake size relative to the investee
 * catches CoreWeave and also catches any small-cap holding. Sorting by
 * intuition is not a rule at all.
 *
 * So nothing is inferred. A pair is circular only if one of the two companies
 * SAYS SO in a filing, and the sentence that says it is kept and linked. If no
 * filing describes a commercial relationship, the pair stays an equity stake,
 * which is all the 13F ever established.
 *
 * ---
 * WHY IT SEARCHES BOTH DIRECTIONS
 *
 * The obvious search is the investee's own 10-K, which is where customer
 * concentration is disclosed — "one customer accounted for 71% of revenue".
 * That works when the investee is public and files.
 *
 * That works when the investee files. Not all of them do: a stake can be in a
 * company that has only just listed and has no 10-K yet, or in one that reports
 * nothing at all. SpaceX is the case that made this concrete — it appears in
 * 13Fs for the first time at the June 2026 quarter, as the largest stake in the
 * whole dataset, with a filing history that starts the same year.
 *
 * So the investor's own filings are searched too, for the investee's name — a
 * company describing what it bought, sold or agreed with a business it also
 * owns. The direction that produced the evidence is recorded, because a
 * supplier disclosing a customer and a customer disclosing a supplier are not
 * the same claim.
 *
 * Run: node scripts/fetch-circular-evidence.mjs
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.join(import.meta.dirname, '..');
const IN = path.join(ROOT, 'data', 'circular.json');
const OUT = path.join(ROOT, 'data', 'circular-evidence.json');
const CACHE = path.join(ROOT, 'data', 'cache', 'edgar');
const UA = { 'User-Agent': 'seventeen-studios-research/1.0 (patelrutvik1702@gmail.com)' };

/*
  A sentence naming the counterparty is not evidence on its own — a 10-K names
  hundreds of companies in risk factors and exhibit lists. It is evidence when
  it also describes a trade: a customer, a supplier, a purchase, a share of
  revenue. Both have to be in the same sentence.
*/
const TRADE = /\b(customer|supplier|suppl(?:y|ies)|vendor|purchas\w*|sold|sells|sale[sd]?|revenue|accounted for|concentration|contract\w*|agreement\w*|order[sd]?|servic\w*|capacity|commitment\w*)\b/i;

/* Sentences long enough to say something and short enough to quote. */
const MIN_QUOTE = 60;
const MAX_QUOTE = 420;

let lastCall = 0;
async function polite(url, { json = true } = {}) {
  const wait = 140 - (Date.now() - lastCall);
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastCall = Date.now();
  const res = await fetch(url, { headers: { ...UA, Accept: json ? 'application/json' : 'text/html' } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return json ? res.json() : res.text();
}

/** Every ticker the SEC knows, so an issuer name off a 13F can become a CIK. */
async function tickerMap() {
  mkdirSync(CACHE, { recursive: true });
  const at = path.join(CACHE, 'company_tickers.json');
  if (!existsSync(at) || Date.now() - Date.parse(JSON.parse(readFileSync(at, 'utf8')).cachedAt) > 7 * 864e5) {
    const body = await polite('https://www.sec.gov/files/company_tickers.json');
    writeFileSync(at, JSON.stringify({ cachedAt: new Date().toISOString(), body }));
  }
  return Object.values(JSON.parse(readFileSync(at, 'utf8')).body);
}

/*
  Names are normalised before comparison, not matched raw. 13F issuer names are
  shouted and abbreviated ("COREWEAVE INC", "Aurora Innovation,Inc.") while the
  ticker file is title case with its own punctuation ("CoreWeave, Inc."). What
  survives normalisation is the distinctive part, and the join is exact on that
  — the Aon-matched-Amazon lesson from the ownership features applies here for
  the same reason: a wrong match invents a commercial relationship.
*/
/* `com` is here because "AMAZON COM INC" would otherwise carry a junk token,
   and a single letter because "(Class C)" leaves a stray "c" behind. */
const LEGAL = /\b(inc|incorporated|corp|corporation|co|com|company|ltd|limited|plc|nv|sa|ag|lp|llc|holdings?|group|the|new|de|cl|class|[a-z])\b/g;
const norm = (s) =>
  (s ?? '')
    .toUpperCase()
    .replace(/&/g, ' AND ')
    .replace(/[^A-Z0-9 ]/g, ' ')
    .toLowerCase()
    .replace(LEGAL, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/*
  ABBREVIATIONS, WITHOUT REOPENING THE AON-IS-AMAZON HOLE.

  13F issuer names are truncated to a fixed width, so the largest stake in the
  set arrives as "SPACE EXPLORATION TECHN CORP" against a ticker file that says
  "SPACE EXPLORATION TECHNOLOGIES CORP". An exact join drops it, and a
  substring join is how AON once matched AMAZON.

  The rule that separates the two: token by token, in order, each token of the
  13F name must be a PREFIX of the corresponding token of the candidate — and
  there must be at least two tokens. "space exploration techn" passes against
  "space exploration technologies". "aon" is one token and cannot qualify at
  all, which is precisely the case that went wrong before.
*/
function abbreviates(shortName, longName) {
  const a = shortName.split(' ').filter(Boolean);
  const b = longName.split(' ').filter(Boolean);
  if (a.length < 2 || b.length < a.length || b.length > a.length + 1) return false;
  return a.every((tok, i) => b[i] === tok || (b[i]?.startsWith(tok) && tok.length >= 4));
}

/*
  WORDS THAT ARE ALSO COMPANY NAMES, AND HOW NOT TO KEEP A LIST OF THEM.

  Searching one distinctive token gives the best recall — filings write
  "NVIDIA" far more often than "NVIDIA Corporation". For most names that is
  fine and for some it is catastrophic: "SPACE EXPLORATION TECHNOLOGIES"
  reduces to "space", which matched "The Company leases office space in several
  U.S. locations" and was reported as a commercial relationship with SpaceX.
  "PLANET LABS" reduces to "planet", which matched "the obligation to protect
  our planet" in an Alphabet sustainability paragraph.

  The first fix was a list of ordinary words to avoid. That is the same
  named-exception trap this whole script exists to avoid: it corrects the two
  cases somebody noticed and waits for the third.

  What separates them without a list is CASE. A company name is a proper noun
  and filings capitalise it; the ordinary word is lowercase mid-sentence.
  "office space" and "our planet" are lowercase, "Planet Labs" and "SpaceX" are
  not. So the search stays broad and the VERIFICATION is case-sensitive, which
  costs only the rare sentence that happens to begin with the word.
*/
const searchable = (s) => {
  const parts = norm(s).split(' ').filter(Boolean);
  return parts.length ? parts[0] : norm(s);
};

/**
 * The needle as a proper noun: whole word, first letter required uppercase,
 * the rest either case so both "NVIDIA" and "Nvidia" match.
 */
const properNoun = (needle) => {
  const body = needle
    .split('')
    .map((ch, i) => {
      if (!/[a-z]/i.test(ch)) return ch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      return i === 0 ? ch.toUpperCase() : `[${ch.toUpperCase()}${ch.toLowerCase()}]`;
    })
    .join('');
  return new RegExp(`\\b${body}\\b`);
};

/*
  ONLY RECENT FILINGS COUNT.

  Without a date bound the search returns whatever matched first, which was a
  2001 Synopsys 10-K/A and a 2002 Delta 10-Q. A commercial relationship
  described a quarter of a century ago is not evidence about a stake held now —
  NVIDIA and Intel signed a patent cross-license in 2011 and that says nothing
  about the $29.99B position taken in 2026. Three years is two full 10-K cycles,
  so a live relationship has had chances to be disclosed inside it.
*/
const SINCE = new Date(Date.now() - 3 * 365 * 864e5).toISOString().slice(0, 10);
const TODAY = new Date().toISOString().slice(0, 10);

async function fullText(query, cik) {
  const url = `https://efts.sec.gov/LATEST/search-index?q=%22${encodeURIComponent(query)}%22`
    + `&ciks=${String(cik).padStart(10, '0')}&forms=10-K,10-Q`
    + `&dateRange=custom&startdt=${SINCE}&enddt=${TODAY}`;
  const body = await polite(url);
  return (body?.hits?.hits ?? []).map((h) => ({
    accession: h._source.adsh,
    doc: h._id.split(':')[1],
    form: h._source.form,
    filed: h._source.file_date,
    cik: h._source.ciks[0],
  }));
}

/** Strip a filing to text and pull the sentence that names the counterparty and a trade. */
async function quoteFrom(hit, needle) {
  const nodash = hit.accession.replace(/-/g, '');
  const url = `https://www.sec.gov/Archives/edgar/data/${Number(hit.cik)}/${nodash}/${hit.doc}`;
  let html;
  try {
    html = await polite(url, { json: false });
  } catch {
    return null;
  }

  const text = html
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&#8217;|&rsquo;/gi, "'")
    .replace(/&#8220;|&#8221;|&ldquo;|&rdquo;/gi, '"')
    .replace(/\s+/g, ' ');

  const re = properNoun(needle);
  let best = null;
  for (const raw of text.split(/(?<=[.;])\s+(?=[A-Z(])/)) {
    const s = raw.trim();
    if (s.length < MIN_QUOTE || s.length > MAX_QUOTE) continue;
    if (!re.test(s) || !TRADE.test(s)) continue;
    /*
      A percentage is the strongest form this disclosure takes — "accounted for
      62% of revenue" is the sentence worth quoting over a mention in a list of
      partners — so it wins ties.
    */
    const score = (/%|\bpercent\b/i.test(s) ? 2 : 0) + (/\bcustomer|supplier\b/i.test(s) ? 1 : 0);
    if (!best || score > best.score) best = { score, quote: s };
    if (best.score === 3) break;
  }
  return best ? { ...best, url, form: hit.form, filed: hit.filed } : null;
}

/* ---------------------------------------------------------------- the run */

const graph = JSON.parse(readFileSync(IN, 'utf8'));
const latest = graph.latestPeriod;
const edges = graph.edges.filter((e) => e.periodIso === latest);
console.log(`evidence: ${edges.length} stakes at ${latest}, across ${new Set(edges.map((e) => e.from)).size} companies`);

const tickers = await tickerMap();
const byName = new Map();
for (const t of tickers) {
  const k = norm(t.title);
  if (k && !byName.has(k)) byName.set(k, t);
}

/* Investor CIKs, for the reverse direction. */
const dir = path.join(ROOT, 'archive', 'constituents');
const snap = readdirSync(dir).filter((f) => f.endsWith('.csv')).sort().pop();
const cikOf = new Map();
for (const r of readFileSync(path.join(dir, snap), 'utf8').trim().split('\n').slice(1)) {
  const m = r.match(/^([^,]+),([^,]*),"([^"]*)"/);
  if (m) cikOf.set(m[1], { cik: m[2].replace(/^0+/, ''), name: m[3] });
}

/*
  ONE ROW PER COMPANY PAIR.

  Lennar's stake in Opendoor arrives as four securities — the common, and three
  classes of warrant — each with its own CUSIP and its own row. They are one
  relationship, and searched separately they produced the same quoted sentence
  four times. Collapsed on the investee's CIK where it resolves, and on the
  issuer name where it does not.
*/
const grouped = new Map();
for (const e of edges) {
  const investee = byName.get(norm(e.to)) ?? [...byName.entries()].find(([k]) => abbreviates(norm(e.to), k))?.[1];
  const key = `${e.from}|${investee?.cik_str ?? norm(e.to)}`;
  const cur = grouped.get(key);
  if (cur) {
    cur.value += e.value;
    /* Keep the name of the largest line — the common stock, not a warrant. */
    if (e.value > cur.largest) { cur.largest = e.value; cur.to = e.to; cur.cusip = e.cusip; }
  } else {
    grouped.set(key, { ...e, investee, largest: e.value });
  }
}
console.log(`evidence: ${edges.length} filing lines collapse to ${grouped.size} company pairs`);

const out = [];
let resolved = 0;
let evidenced = 0;

for (const e of grouped.values()) {
  const investor = cikOf.get(e.from);
  const { investee } = e;
  if (investee) resolved += 1;

  const investorTerm = searchable(investor?.name ?? e.fromName);
  const investeeTerm = searchable(investee?.title ?? e.to);

  let found = null;

  /* Direction 1: the investee discloses the investor. Customer concentration
     lives here, and it is the stronger of the two claims. */
  if (investee) {
    try {
      const hits = await fullText(investorTerm, investee.cik_str);
      for (const h of hits.slice(0, 2)) {
        const q = await quoteFrom(h, investorTerm);
        if (q) { found = { ...q, direction: 'investee-discloses-investor', filer: investee.title }; break; }
      }
    } catch (err) {
      console.warn(`  ! ${e.from}->${e.to}: ${err.message}`);
    }
  }

  /* Direction 2: the investor describes the investee. The only route when the
     investee is private — which the largest stake in the set is. */
  if (!found && investor?.cik) {
    try {
      const hits = await fullText(investeeTerm, investor.cik);
      for (const h of hits.slice(0, 2)) {
        const q = await quoteFrom(h, investeeTerm);
        if (q) { found = { ...q, direction: 'investor-discloses-investee', filer: investor.name }; break; }
      }
    } catch (err) {
      console.warn(`  ! ${e.from}->${e.to} (reverse): ${err.message}`);
    }
  }

  if (found) evidenced += 1;
  out.push({
    from: e.from,
    fromName: e.fromName,
    to: e.to,
    cusip: e.cusip,
    value: e.value,
    period: e.period,
    periodIso: e.periodIso,
    investeeTicker: investee?.ticker ?? null,
    investeeCik: investee?.cik_str ?? null,
    evidence: found
      ? {
        direction: found.direction,
        filer: found.filer,
        form: found.form,
        filed: found.filed,
        url: found.url,
        quote: found.quote,
      }
      : null,
  });

  console.log(
    `  ${e.from.padEnd(6)} ${e.to.slice(0, 30).padEnd(32)} `
    + `$${(e.value / 1e9).toFixed(2).padStart(6)}B  `
    + (found ? `${found.direction === 'investee-discloses-investor' ? 'investee' : 'investor'} says` : investee ? '—' : '(no CIK)'),
  );
}

mkdirSync(path.dirname(OUT), { recursive: true });
writeFileSync(OUT, `${JSON.stringify({
  fetchedAt: new Date().toISOString(),
  source: 'EDGAR full-text search over 10-K and 10-Q, both directions',
  period: latest,
  considered: grouped.size,
  filingLines: edges.length,
  investeesResolved: resolved,
  evidenced,
  note:
    'A stake is called circular financing only where a filing describes a commercial relationship '
    + 'between the two companies, and the sentence that describes it is quoted with a link. '
    + 'Everything else stays an equity stake, which is all a 13F establishes. Private investees can '
    + 'only be evidenced from the investor\'s own filings, since they file none of their own.',
  stakes: out,
})}\n`);

console.log(`\nevidence: ${resolved} of ${edges.length} investees resolved to a CIK`);
console.log(`evidence: ${evidenced} pairs carry a filing that describes a commercial relationship`);
console.log('evidence: wrote data/circular-evidence.json');
