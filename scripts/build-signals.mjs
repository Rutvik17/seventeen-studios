#!/usr/bin/env node
/**
 * WHAT THE FILINGS SAY ABOUT WHAT THE BOOK HOLDS.
 *
 * The account page shows positions and returns. This is the layer underneath:
 * for every name in the book, what institutions did with it last quarter, what
 * its own officers did with their own money, what the company reported for its
 * last quarter, and what it owns of other listed companies — split into
 * ordinary equity stakes and the ones a filing describes as a trading
 * relationship too.
 *
 * ---
 * WHY IT IS JOINED TO THE BOOK RATHER THAN LISTED SEPARATELY
 *
 * Half a million insider filings is a database. The same data filtered to the
 * eighty-seven names actually held is a position sheet, and that is the thing
 * worth looking at: an officer buying a stock the model already owns is a
 * different fact from an officer buying something nobody holds.
 *
 * Everything here is filtered to the current book for that reason. The full
 * corpus stays on disk.
 *
 * Run: npm run signals
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.join(import.meta.dirname, '..');
const DATA = path.join(ROOT, 'data');
const OUT = path.join(ROOT, 'public', 'data', 'signals.json');

const read = (name) => {
  const at = path.join(DATA, name);
  if (!existsSync(at)) throw new Error(`missing ${name} — run its fetch script first`);
  return JSON.parse(readFileSync(at, 'utf8'));
};

const r4 = (v) => (Number.isFinite(v) ? Math.round(v * 1e4) / 1e4 : null);

const backtest = read('backtest-pit.json');
const form4 = read('form4.json');
const thirteenF = read('13f.json');
const earnings = read('earnings.json');
const circular = read('circular.json');
const evidence = read('circular-evidence.json');
const fundamentals = read('fundamentals.json');

const book = backtest.journal.at(-1);
const asOf = book.date;
const held = new Map(book.positions.map((p) => [p.symbol, p]));

/* ------------------------------------------------------- insider activity */

/*
  A rolling year, because insider filings are sparse: a given name has a handful
  of days a year with any activity at all, and a shorter window would be empty
  for most of the book and read as "no insiders are buying" when the truth is
  "nobody filed this month".
*/
const from = new Date(asOf);
from.setFullYear(from.getFullYear() - 1);
const since = from.toISOString().slice(0, 10);

const insiderByName = new Map();
for (const e of form4.events) {
  if (e.date < since || e.date > asOf || !held.has(e.symbol)) continue;
  const cur = insiderByName.get(e.symbol) ?? { buyers: 0, sellers: 0, buy: 0, sell: 0, last: null };
  cur.buyers += e.buyers;
  cur.sellers += e.sellers;
  cur.buy += e.buy;
  cur.sell += e.sell;
  if (!cur.last || e.date > cur.last) cur.last = e.date;
  insiderByName.set(e.symbol, cur);
}

/*
  Purchases are the interesting half and the rare one — across this corpus
  insiders sell 2.6 times as often as they buy, because they are paid in stock
  and have to convert it to live on. A sale carries a dozen explanations that
  have nothing to do with the company; a purchase carries one.
*/

/*
  RANKED BY DOLLARS, NOT BY FILING COUNT — and the count is called a count of
  FILINGS, because that is what it is.

  form4.json is aggregated to symbol-and-day, so `buyers` is the number of
  filings that day carrying a purchase, and summing it over a year does not
  give a number of people. Ranking on that sum put TPL first with "219 buyers":
  212 separate days, almost every one a single filing for about $890, which is
  a standing plan running on autopilot rather than 219 executives forming a
  view. It outranked a $50.9M purchase at KKR by 27 to 1.

  Dollars cannot be gamed that way. A daily $890 buy sorts where $866k belongs,
  and the filing count stays on the row as context instead of as the ranking.
*/
const insiderBuying = [...insiderByName.entries()]
  .filter(([, v]) => v.buyers > 0)
  .map(([symbol, v]) => ({
    symbol,
    buyFilings: v.buyers,
    sellFilings: v.sellers,
    buyValue: Math.round(v.buy),
    last: v.last,
    weight: r4(held.get(symbol)?.weight ?? 0),
  }))
  .sort((a, b) => b.buyValue - a.buyValue)
  .slice(0, 12);

const insiderSelling = [...insiderByName.entries()]
  .filter(([, v]) => v.sellers > 0 && v.buyers === 0)
  .map(([symbol, v]) => ({
    symbol,
    sellFilings: v.sellers,
    sellValue: Math.round(v.sell),
    last: v.last,
    weight: r4(held.get(symbol)?.weight ?? 0),
  }))
  .sort((a, b) => b.sellValue - a.sellValue)
  .slice(0, 12);

/* --------------------------------------------------- institutional flows */

const quarters = thirteenF.quarters.filter((q) => q.period <= '2026-12-31');
const latest = quarters.at(-1);
const previous = quarters.at(-2);

/*
  HOLDER COUNT, not dollars. The SEC changed 13F from reporting thousands to
  whole dollars part-way through the history and the implied price per share
  reconciles on neither side, so the value column is not comparable. A count of
  managers is unit-free and says the thing anyway: more of them arrived, or
  fewer did.
*/
/*
  A FLOOR, because a handful of holder counts are a failed join rather than a
  fact about the company.

  13F identifies the issuer by a free-text name, so a name that does not match
  collects only the filings that happened to spell it our way. The tell is the
  size: McDonald's reports 1 institutional holder here, Bank of America 3,
  Molson Coors 5. Real members of this index have four figures — the 5th
  percentile is 741 and the median is 1,699 — so anything in single digits is
  the join, not the ownership.

  Left in, those names dominate the display: TAP going 2 holders to 5 is +150%
  and the largest inflow on the page, computed from a denominator of two. The
  floor sits at 500, well under the 5th percentile and far above the broken
  cluster, and costs four of the eighty-seven names.

  This is a DISPLAY filter and nothing more. The model saw these columns as
  they are, and walk-forward validation priced the noise in them; a headline
  number is what cannot survive it.
*/
const HOLDER_FLOOR = 500;
let joinFailures = 0;

const flows = [...held.keys()]
  .map((symbol) => {
    const now = latest?.holdings[symbol];
    const then = previous?.holdings[symbol];
    if (!now || !then || !(then.holders > 0)) return null;
    if (now.holders < HOLDER_FLOOR || then.holders < HOLDER_FLOOR) {
      joinFailures++;
      return null;
    }
    return {
      symbol,
      holders: now.holders,
      change: r4(now.holders / then.holders - 1),
      weight: r4(held.get(symbol)?.weight ?? 0),
    };
  })
  .filter(Boolean)
  .sort((a, b) => b.change - a.change);

/* --------------------------------------------------- what they reported */

/*
  REVENUE AND EPS, NOT A WORD COUNT.

  This section used to show "tone" — positive words less negative ones per
  thousand, off the Loughran-McDonald finance dictionaries. That is a real
  measure and it is a sensible model FEATURE, but it is a strange thing to put
  in front of a reader of an account: nobody reads an earnings release to find
  out how cheerful it was. They read it for revenue, earnings per share, and
  what the company said about next quarter.

  So the 8-K supplies the two things only it knows — the date results were
  announced, and whether guidance moved — and the numbers come from the
  company's own XBRL filing.

  EPS is the DILUTED figure as reported, never net income divided by a share
  count. `CommonStockSharesOutstanding` is a cover-page tag filers update
  irregularly, and for some names the newest share count is two years older
  than the newest income figure; dividing one by the other gives a number that
  is wrong and looks entirely reasonable.
*/

/* The 8-K, for the announcement date and the guidance direction. */
const releaseByName = new Map();
for (const r of earnings.releases) {
  if (!held.has(r.symbol)) continue;
  const cur = releaseByName.get(r.symbol);
  if (!cur || r.date > cur.date) releaseByName.set(r.symbol, r);
}

const DAY = 864e5;
const days = (a, b) => Math.round((Date.parse(a) - Date.parse(b)) / DAY);

/*
  The quarter a release is ABOUT, matched by date rather than assumed.

  A company announces results some weeks after the quarter closes — never
  before it closes, and rarely more than four months after. The XBRL fact whose
  period end falls in that window is the one the 8-K is reporting, and taking
  the newest fact instead would sometimes take a quarter the company has not
  announced yet.
*/
const reportedAt = (facts, releaseDate) => {
  let best = null;
  for (const f of facts ?? []) {
    const gap = days(releaseDate, f.end);
    if (gap < 0 || gap > 120) continue;
    if (!best || f.end > best.end) best = f;
  }
  return best;
};

/* The same quarter a year earlier, within a fortnight either side — fiscal
   calendars shift by a few days from year to year. */
const yearBefore = (facts, end) => {
  const target = Date.parse(end) - 365 * DAY;
  let best = null;
  for (const f of facts ?? []) {
    const off = Math.abs(Date.parse(f.end) - target);
    if (off > 20 * DAY) continue;
    if (!best || off < Math.abs(Date.parse(best.end) - target)) best = f;
  }
  return best;
};

const growth = (now, then) =>
  Number.isFinite(now) && Number.isFinite(then) && then > 0 ? r4(now / then - 1) : null;

const reported = [];
for (const [symbol, release] of releaseByName) {
  const facts = fundamentals.facts[symbol];
  if (!facts) continue;

  const rev = reportedAt(facts.revenue, release.date);
  const eps = reportedAt(facts.eps, release.date);
  if (!rev && !eps) continue;

  const quarter = rev?.end ?? eps?.end;
  const revPrior = rev ? yearBefore(facts.revenue, rev.end) : null;
  const epsPrior = eps ? yearBefore(facts.eps, eps.end) : null;

  reported.push({
    symbol,
    filed: release.date,
    quarter,
    revenue: rev ? Math.round(rev.val) : null,
    revenueGrowth: rev && revPrior ? growth(rev.val, revPrior.val) : null,
    eps: eps ? r4(eps.val) : null,
    epsPrior: epsPrior ? r4(epsPrior.val) : null,
    guidance: release.guidance,
    weight: r4(held.get(symbol)?.weight ?? 0),
  });
}

/*
  Ranked on revenue growth, which is the one column every company has and the
  one that is comparable across them. EPS is the more meaningful number and the
  less comparable one — a single charge can put it negative at a company whose
  business did not change.
*/
const withGrowth = reported.filter((r) => r.revenueGrowth !== null)
  .sort((a, b) => b.revenueGrowth - a.revenueGrowth);

/* ------------------------------------------- stakes, and which are circular */

/*
  TWO DIFFERENT QUESTIONS, SO TWO SECTIONS.

  These were one list called "who owns whom", and that conflated two things a
  reader would not want conflated. Ventas owning a hospital operator is
  ordinary corporate investment. NVIDIA owning CoreWeave, which buys NVIDIA
  GPUs with NVIDIA's money, is a financing loop — the same money appearing as
  an investment on one side and as revenue on the other.

  A 13F cannot tell those apart: it establishes the stake and says nothing
  about whether the two companies trade. So the split is not inferred here.
  `fetch-circular-evidence.mjs` searches both companies' filings for a sentence
  describing a commercial relationship, and a stake is called circular only
  where such a sentence exists — quoted, dated and linked. Everything else
  stays an equity stake, which is all the filing ever established.
*/

/*
  The issuer name as filed, tidied only where it is shouted. 13F has no house
  style — "INTEL CORP" sits beside "Grab Holdings Limited" in the same file —
  so an all-caps name is title-cased and a name that already carries its own
  capitals is left exactly as its filer wrote it.

  Title-casing has one trap and it is acronyms: a blanket lowercase turns CME
  GROUP into "Cme" and AST SPACEMOBILE into "Ast". Tokens of three letters or
  fewer keep their capitals, which is the shape an acronym has and a word this
  short almost never does. "Group" and "Holdings" are NOT stripped for the same
  reason — CME Group without the Group is not a company anybody recognises.
*/
const SUFFIX = /[,\s]+(inc|incorporated|corp|corporation|co|ltd|limited|plc|nv|sa|ag|lp|llc)\b\.?/gi;
const tidy = (name) => {
  const cased =
    name === name.toUpperCase()
      ? name
        .split(' ')
        .map((word) => (word.replace(/[^A-Z]/g, '').length <= 3
          ? word
          : word.toLowerCase().replace(/(^|[(&/-])([a-z])/g, (_, edge, ch) => edge + ch.toUpperCase())))
        .join(' ')
      : name;

  return (
    cased
      .replace(SUFFIX, '')
      /* A lone trailing letter is a legal suffix cut off by the field width — "WATERBRIDGE INFRASTRUCTURE L". */
      .replace(/\s+[A-Za-z]\.?$/, '')
      .replace(/[\s,.]+$/, '')
      .trim() || name
  );
};

const latestPeriod = circular.latestPeriod;
const allPeriods = [...new Set(circular.edges.map((e) => e.periodIso))].sort();
const priorPeriod = allPeriods[allPeriods.indexOf(latestPeriod) - 1] ?? null;

/* The same collapse the evidence script applies: share classes of one investee
   are one relationship, so the prior quarter has to be summed the same way. */
const collapse = (rows) => {
  const out = new Map();
  for (const e of rows) {
    const key = `${e.from}|${e.cusip}`;
    out.set(key, (out.get(key) ?? 0) + e.value);
  }
  return out;
};
const before = collapse(circular.edges.filter((e) => e.periodIso === priorPeriod));

/*
  Filings are HTML, and stripping the tags leaves the entities behind. The
  quotes came through carrying "&#9642;" (a black square, used as a bullet) and
  "&#8217;" mid-word, which reads as markup escaping onto the page. Decoded
  here rather than in the fetcher so that improving it never costs another pass
  over EDGAR.
*/
const ENTITIES = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
  rsquo: '’', lsquo: '‘', ldquo: '“', rdquo: '”',
  mdash: '—', ndash: '–', hellip: '…', bull: '•',
};
const readable = (text) =>
  text
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number(dec)))
    .replace(/&([a-z]+);/gi, (whole, name) => ENTITIES[name.toLowerCase()] ?? whole)
    /* Bullets and zero-width joiners survive decoding and are noise in a quote. */
    .replace(/[▪•​‌‍﻿]/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\s+([,.;:])/g, '$1')
    .trim();

const stakes = evidence.stakes
  .map((st) => ({
    from: st.from,
    fromName: st.fromName,
    to: tidy(st.to),
    ticker: st.investeeTicker,
    billions: r4(st.value / 1e9),
    change: before.get(`${st.from}|${st.cusip}`) > 0
      ? r4(st.value / before.get(`${st.from}|${st.cusip}`) - 1)
      : null,
    evidence: st.evidence
      ? {
        quote: readable(st.evidence.quote),
        filer: st.evidence.filer,
        form: st.evidence.form,
        filed: st.evidence.filed,
        url: st.evidence.url,
        /* Which company said it. A supplier naming a customer and a customer
           naming a supplier are not the same claim. */
        direction: st.evidence.direction === 'investee-discloses-investor' ? 'investee' : 'investor',
      }
      : null,
  }))
  .sort((a, b) => b.billions - a.billions);

const circularStakes = stakes.filter((s) => s.evidence);
const plainStakes = stakes.filter((s) => !s.evidence);

/*
  A FLOOR FOR WHAT GETS ITS OWN CARD, because the tail is long and immaterial.

  All 58 evidenced pairs rendered as cards made the section 24,000 pixels tall
  on a phone, and the bottom of it was Merck's $0.0M in Neuphoria and J&J's
  $0.2M in Adicet — real relationships, disclosed, and far too small to be
  worth a paragraph each.

  A hundred million is the cut. It keeps 28 pairs carrying 98.9% of the money,
  and the ones it drops are counted and totalled in the copy rather than
  disappearing, so the reader can see the size of what is not shown.
*/
const CARD_FLOOR = 0.1;
const cardStakes = circularStakes.filter((s) => s.billions >= CARD_FLOOR);
const tailStakes = circularStakes.filter((s) => s.billions < CARD_FLOOR);

const payload = {
  generatedAt: new Date().toISOString(),
  asOf,
  bookSize: held.size,
  window: { since, until: asOf },
  insider: {
    buying: insiderBuying,
    selling: insiderSelling,
    /* The ratio across the whole corpus, for scale. */
    corpusBuys: form4.events.reduce((s, e) => s + e.buyers, 0),
    corpusSells: form4.events.reduce((s, e) => s + e.sellers, 0),
  },
  flows: {
    period: latest?.period ?? null,
    previous: previous?.period ?? null,
    inflow: flows.slice(0, 10),
    outflow: flows.slice(-10).reverse(),
    compared: flows.length,
    excluded: joinFailures,
    floor: HOLDER_FLOOR,
  },
  reported: {
    growing: withGrowth.slice(0, 8),
    shrinking: withGrowth.slice(-8).reverse(),
    covered: reported.length,
    withGrowth: withGrowth.length,
    raised: reported.filter((r) => r.guidance > 0).length,
    lowered: reported.filter((r) => r.guidance < 0).length,
  },
  stakes: {
    period: latestPeriod,
    prior: priorPeriod,
    list: plainStakes.slice(0, 20),
    total: plainStakes.length,
    holders: new Set(plainStakes.map((s) => s.from)).size,
    billions: r4(plainStakes.reduce((t, s) => t + s.billions, 0)),
  },
  circular: {
    period: latestPeriod,
    prior: priorPeriod,
    list: cardStakes,
    total: circularStakes.length,
    holders: new Set(circularStakes.map((s) => s.from)).size,
    billions: r4(circularStakes.reduce((t, s) => t + s.billions, 0)),
    /* What the card floor leaves out, so the copy can say it. */
    floor: CARD_FLOOR,
    tail: tailStakes.length,
    tailBillions: r4(tailStakes.reduce((t, s) => t + s.billions, 0)),
    /* How the split was arrived at, so the page can state it. */
    considered: evidence.considered,
    resolved: evidence.investeesResolved,
  },
};

writeFileSync(OUT, `${JSON.stringify(payload)}\n`);
const bytes = readFileSync(OUT).length;
console.log(`signals: book of ${held.size} as at ${asOf}`);
console.log(`signals: ${insiderBuying.length} names with insider buying, ${insiderSelling.length} selling only`);
console.log(
  `signals: ${flows.length} names with a quarter-on-quarter ownership change` +
    (joinFailures ? ` (${joinFailures} dropped below ${HOLDER_FLOOR} holders — failed name join)` : ''),
);
console.log(
  `signals: ${reported.length} names with a reported quarter, ${withGrowth.length} comparable year on year,`
    + ` ${payload.reported.raised} raised guidance and ${payload.reported.lowered} lowered it`,
);
console.log(
  `signals: ${stakes.length} stakes at ${latestPeriod} — ${circularStakes.length} carry a filing`
    + ` describing a commercial relationship, ${plainStakes.length} do not`,
);
console.log(`signals: wrote ${(bytes / 1024).toFixed(1)} KB to public/data/signals.json`);
