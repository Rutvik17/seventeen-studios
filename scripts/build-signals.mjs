#!/usr/bin/env node
/**
 * WHAT THE FILINGS SAY ABOUT WHAT THE BOOK HOLDS.
 *
 * The account page shows positions and returns. This is the layer underneath:
 * for every name in the book, what institutions did with it last quarter, what
 * its own officers did with their own money, what the company said about its
 * quarter, and — where it exists — who it owns.
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

/* -------------------------------------------------------- what they said */

const byName = new Map();
for (const r of earnings.releases) {
  if (!held.has(r.symbol)) continue;
  const cur = byName.get(r.symbol);
  if (!cur || r.date > cur.date) byName.set(r.symbol, r);
}

/*
  Tone against the SAME company's previous release, not against the market.
  Absolute tone is mostly house style — some firms write "outstanding" every
  quarter — so the move is the part that might mean something.
*/
const priorByName = new Map();
for (const r of earnings.releases) {
  if (!held.has(r.symbol)) continue;
  const latestForName = byName.get(r.symbol);
  if (!latestForName || r.date >= latestForName.date) continue;
  const cur = priorByName.get(r.symbol);
  if (!cur || r.date > cur.date) priorByName.set(r.symbol, r);
}

const language = [...byName.values()]
  .map((r) => {
    const prior = priorByName.get(r.symbol);
    return {
      symbol: r.symbol,
      date: r.date,
      tone: r4(r.tone),
      change: prior ? r4(r.tone - prior.tone) : null,
      hedging: r4(r.hedging),
      guidance: r.guidance,
      weight: r4(held.get(r.symbol)?.weight ?? 0),
    };
  })
  .sort((a, b) => b.tone - a.tone);

/* ------------------------------------------------------- who owns whom */

/*
  ONE EDGE PER RELATIONSHIP, AT ITS LATEST PERIOD.

  circular.json is a row per stake per quarter, and three quarters are in
  range. Sorting the raw rows by value therefore ranked the same relationship
  three times: Uber's stake in Grab took the top three places on the list,
  reading as three separate holdings when it is one holding measured on three
  dates. Collapse to the newest quarter per (holder, security) and the previous
  quarter becomes the useful thing instead — what the stake did.
*/
const MONTHS = { JAN: 0, FEB: 1, MAR: 2, APR: 3, MAY: 4, JUN: 5, JUL: 6, AUG: 7, SEP: 8, OCT: 9, NOV: 10, DEC: 11 };
const periodOrder = (p) => {
  const [, mon, year] = p.split('-');
  return Number(year) * 12 + MONTHS[mon.toUpperCase()];
};

/*
  The issuer name as filed, tidied only where it is shouted. 13F has no house
  style — "INTEL CORP" sits beside "Grab Holdings Limited" in the same file —
  so an all-caps name is title-cased and a name that already carries its own
  capitals is left exactly as its filer wrote it. Corporate suffixes go because
  they are noise in a diagram, not because they are wrong.
*/
const SUFFIX = /[,\s]+(inc|incorporated|corp|corporation|co|ltd|limited|plc|nv|sa|ag|lp|llc)\b\.?/gi;

/*
  Title-casing shouted names has one trap and it is acronyms: a blanket
  lowercase turns CME GROUP into "Cme" and AST SPACEMOBILE into "Ast". Tokens
  of three letters or fewer keep their capitals, which is the shape an acronym
  has and a word this short almost never does.

  "Group" and "Holdings" are NOT stripped, for the same reason — CME Group
  without the Group is not a company anybody recognises.
*/
const tidy = (name) => {
  const cased =
    name === name.toUpperCase()
      ? name
          .split(' ')
          .map((word) =>
            word.replace(/[^A-Z]/g, '').length <= 3
              ? word
              : word.toLowerCase().replace(/(^|[(&/-])([a-z])/g, (_, edge, ch) => edge + ch.toUpperCase()),
          )
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

const byRelationship = new Map();
for (const e of circular.edges) {
  const key = `${e.from}|${e.cusip}`;
  const cur = byRelationship.get(key);
  if (!cur || periodOrder(e.period) > periodOrder(cur.period)) byRelationship.set(key, e);
}

/* The quarter before the latest one, so a stake can be shown moving. */
const priorRelationship = new Map();
for (const e of circular.edges) {
  const key = `${e.from}|${e.cusip}`;
  const newest = byRelationship.get(key);
  if (!newest || periodOrder(e.period) >= periodOrder(newest.period)) continue;
  const cur = priorRelationship.get(key);
  if (!cur || periodOrder(e.period) > periodOrder(cur.period)) priorRelationship.set(key, e);
}

const edges = [...byRelationship.entries()]
  .map(([key, e]) => {
    const prior = priorRelationship.get(key);
    return {
      from: e.from,
      fromName: e.fromName,
      to: tidy(e.to),
      billions: r4(e.value / 1e9),
      change: prior && prior.value > 0 ? r4(e.value / prior.value - 1) : null,
      period: e.period,
      inBook: held.has(e.from),
    };
  })
  .sort((a, b) => b.billions - a.billions);

const stakes = edges.filter((e) => e.inBook).slice(0, 14);

/* Everything in the graph, held or not — the structure is worth seeing whole. */
const graph = edges.slice(0, 18);

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
  language: {
    positive: language.slice(0, 8),
    negative: language.slice(-8).reverse(),
    raised: language.filter((l) => l.guidance > 0).length,
    lowered: language.filter((l) => l.guidance < 0).length,
  },
  circular: {
    heldStakes: stakes,
    graph,
    /* Relationships, not filing rows — one per holder-and-security pair. */
    totalEdges: edges.length,
    holders: new Set(edges.map((e) => e.from)).size,
    latestPeriod: circular.edges.reduce(
      (best, e) => (!best || periodOrder(e.period) > periodOrder(best) ? e.period : best),
      null,
    ),
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
console.log(`signals: ${language.length} with a scored release, ${payload.language.raised} raised guidance`);
console.log(
  `signals: ${edges.length} ownership relationships across ${payload.circular.holders} companies,` +
    ` ${stakes.length} of them held`,
);
console.log(`signals: wrote ${(bytes / 1024).toFixed(1)} KB to public/data/signals.json`);
