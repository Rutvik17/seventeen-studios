/**
 * Sixteen years of company fundamentals from SEC XBRL, point-in-time.
 *
 *   npm run data:fundamentals
 *
 * Writes `data/fundamentals.json` — gitignored. One row per company per quarter
 * per tag, each carrying the date the fact may first be USED.
 *
 * ---
 * WHY THE FRAMES API AND NOT companyfacts
 *
 * `companyfacts` returns everything one company ever reported, with exact filing
 * dates, and is the obviously correct source. It is also about 5 MB per company:
 * 503 of them is 2.5 GB every time this runs, which is not a nightly job.
 *
 * `frames` inverts the axes — one tag, one period, every company that reported
 * it, in a single response. Measured: 2,095 companies for Revenues in one
 * request. Roughly 20 tags across 66 quarters is 1,300 requests, about two
 * minutes at the SEC's rate limit.
 *
 * ---
 * THE THING FRAMES DOES NOT GIVE YOU, AND WHAT IS DONE ABOUT IT
 *
 * Frames carries `accn` but NOT `filed`. Without a filing date there is no way
 * to know when the market actually learned a number, and using a fact from the
 * quarter it describes rather than the quarter it was published in is
 * look-ahead bias of the most damaging kind — it hands the model earnings before
 * they were announced, which is precisely the information that moves a stock.
 *
 * So availability is derived from the regulatory deadline instead: a fact is
 * treated as unknown until the filing deadline for its period has passed. Real
 * filings usually arrive sooner, which means this is CONSERVATIVE — the model is
 * occasionally handed a fact a few weeks later than a real trader would have had
 * it. That direction of error is safe. The other direction is not, and no amount
 * of care downstream can undo it.
 *
 * Against a 21-day prediction horizon, being a fortnight conservative costs
 * little; being a fortnight optimistic invents the entire result.
 */

import { mkdirSync, writeFileSync, statSync, existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outFile = path.join(root, 'data', 'fundamentals.json');
const pricesFile = path.join(root, 'data', 'prices.json');

const UA = { 'User-Agent': 'seventeen-studios research patelrutvik1702@gmail.com' };

const FIRST_YEAR = 2010;

/*
  DURATION tags cover a span (a quarter of revenue) and use CY2024Q1.
  INSTANT tags are a snapshot (inventory on a date) and use CY2024Q1I.
  Asking for the wrong one returns 404, which is why the kind is declared.

  Several concepts have more than one tag because companies genuinely disagree
  about which to use — NVDA reports capex under PaymentsToAcquireProductiveAssets
  while most of the index uses PaymentsToAcquirePropertyPlantAndEquipment, and
  its "standard" tag has been stale since 2011. The first tag in each group that
  a company actually reports wins.
*/
const CONCEPTS = [
  { role: 'revenue', kind: 'duration', tags: ['Revenues', 'RevenueFromContractWithCustomerExcludingAssessedTax', 'SalesRevenueNet'] },
  { role: 'grossProfit', kind: 'duration', tags: ['GrossProfit'] },
  { role: 'operatingIncome', kind: 'duration', tags: ['OperatingIncomeLoss'] },
  { role: 'netIncome', kind: 'duration', tags: ['NetIncomeLoss'] },
  /*
    EPS AS REPORTED, not net income divided by a share count.

    The share count here is `CommonStockSharesOutstanding`, a cover-page tag
    filers update irregularly — for some names the newest value is two years
    older than the newest income figure, and dividing one by the other produces
    a number that is wrong and looks fine. Diluted EPS is the figure the company
    itself struck, on the share base it actually used, and it is the number a
    reader has seen quoted everywhere else.
  */
  { role: 'eps', kind: 'duration', unit: 'USD-per-shares', tags: ['EarningsPerShareDiluted', 'EarningsPerShareBasicAndDiluted'] },
  { role: 'rnd', kind: 'duration', tags: ['ResearchAndDevelopmentExpense'] },
  // The user's thesis lives here: capex is where a company puts its conviction.
  { role: 'capex', kind: 'duration', tags: ['PaymentsToAcquirePropertyPlantAndEquipment', 'PaymentsToAcquireProductiveAssets'] },
  { role: 'operatingCashFlow', kind: 'duration', tags: ['NetCashProvidedByUsedInOperatingActivities', 'NetCashProvidedByUsedInOperatingActivitiesContinuingOperations'] },
  { role: 'buybacks', kind: 'duration', tags: ['PaymentsForRepurchaseOfCommonStock'] },
  // Equity stakes in other public companies — the circular-financing leg that
  // NVDA's own 13F confirms: $63.4B of positions in its own customers.
  { role: 'equityStakes', kind: 'duration', tags: ['PaymentsToAcquireEquitySecuritiesFvNi', 'PaymentsToAcquireEquityMethodInvestments'] },

  { role: 'inventory', kind: 'instant', tags: ['InventoryNet'] },
  { role: 'receivables', kind: 'instant', tags: ['AccountsReceivableNetCurrent'] },
  { role: 'assets', kind: 'instant', tags: ['Assets'] },
  { role: 'liabilities', kind: 'instant', tags: ['Liabilities'] },
  { role: 'equity', kind: 'instant', tags: ['StockholdersEquity'] },
  { role: 'debt', kind: 'instant', tags: ['LongTermDebtNoncurrent', 'LongTermDebt'] },
  { role: 'cash', kind: 'instant', tags: ['CashAndCashEquivalentsAtCarryingValue'] },
  /*
    Share counts are denominated in SHARES, not dollars.

    The frames URL carries the unit, and requesting `/USD/` for a share count
    returns a clean 404 that looks exactly like "nobody reported this". It
    printed `shares 0 facts across 0 companies` next to sixteen healthy rows —
    a silent hole in dilution and buyback coverage that no error would ever
    have surfaced.
  */
  { role: 'shares', kind: 'instant', unit: 'shares', tags: ['CommonStockSharesOutstanding', 'EntityCommonStockSharesOutstanding'] },
];

/*
  Filing deadlines, in days after period end.

  A large accelerated filer has 40 days for a 10-Q and 60 for a 10-K; smaller
  filers get 45 and 90. Using the LATER end of each range keeps this on the safe
  side of every filer in the index.
*/
const LAG_QUARTER = 50;
const LAG_ANNUAL = 85;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Quarters to request, oldest first. */
function periods() {
  const out = [];
  const now = new Date();
  const lastYear = now.getUTCFullYear();
  for (let y = FIRST_YEAR; y <= lastYear; y++) {
    for (let q = 1; q <= 4; q++) {
      if (y === lastYear && q > Math.ceil((now.getUTCMonth() + 1) / 3)) break;
      out.push({ y, q });
    }
  }
  return out;
}

/** The date a fact for this period may first be used. */
function availableFrom(end, quarter) {
  const d = new Date(end);
  d.setUTCDate(d.getUTCDate() + (quarter === 4 ? LAG_ANNUAL : LAG_QUARTER));
  return d.toISOString().slice(0, 10);
}

async function frame(tag, kind, y, q, unit = 'USD') {
  const period = `CY${y}Q${q}${kind === 'instant' ? 'I' : ''}`;
  const url = `https://data.sec.gov/api/xbrl/frames/us-gaap/${tag}/${unit}/${period}.json`;
  const res = await fetch(url, { headers: UA });
  // 404 simply means nobody reported that tag for that period. Common and fine.
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`${tag} ${period}: HTTP ${res.status}`);
  return res.json();
}

async function main() {
  if (!existsSync(pricesFile)) {
    throw new Error('data/prices.json missing — run `npm run data:prices` first');
  }
  const prices = JSON.parse(readFileSync(pricesFile, 'utf8'));
  const byCik = new Map();
  for (const u of prices.universe) byCik.set(Number(u.cik), u.symbol);
  console.log(`  ${byCik.size} companies to match on CIK`);

  const quarters = periods();
  const total = CONCEPTS.reduce((s, c) => s + c.tags.length, 0) * quarters.length;
  console.log(`  ${CONCEPTS.length} concepts, ${quarters.length} quarters, ${total} requests`);

  /** symbol -> role -> [{ end, val, from, tag }] */
  const facts = {};
  let requests = 0;
  let hits = 0;

  for (const concept of CONCEPTS) {
    for (const { y, q } of quarters) {
      /*
        Tags within a concept are tried in order and the FIRST one a company
        reports for that period wins. Summing them would double-count a company
        that reports two, and taking the last would let a rarely-used tag
        overwrite the primary one.
      */
      const claimed = new Set();
      for (const tag of concept.tags) {
        let json = null;
        try {
          json = await frame(tag, concept.kind, y, q, concept.unit ?? 'USD');
        } catch (e) {
          console.log(`  ! ${e.message}`);
        }
        requests++;
        // SEC asks for no more than 10 requests a second.
        await sleep(110);
        if (!json?.data) continue;

        for (const d of json.data) {
          const symbol = byCik.get(d.cik);
          if (!symbol || claimed.has(d.cik)) continue;
          if (!Number.isFinite(d.val)) continue;
          claimed.add(d.cik);
          hits++;

          const bucket = (facts[symbol] ??= {});
          const list = (bucket[concept.role] ??= []);
          list.push({
            end: d.end,
            val: d.val,
            from: availableFrom(d.end, q),
            tag,
          });
        }
      }
      if (requests % 200 === 0) {
        console.log(`  …${requests}/${total} requests, ${hits.toLocaleString()} facts`);
      }
    }
  }

  // Chronological within each role, so feature code can walk forwards.
  for (const roles of Object.values(facts)) {
    for (const list of Object.values(roles)) list.sort((a, b) => a.end.localeCompare(b.end));
  }

  const covered = Object.keys(facts).length;
  const out = {
    fetchedAt: new Date().toISOString(),
    source: 'SEC XBRL frames API',
    availability: `period end + ${LAG_QUARTER}d (Q1-Q3) / ${LAG_ANNUAL}d (Q4), the filing deadline — conservative, never early`,
    concepts: CONCEPTS.map((c) => c.role),
    facts,
  };

  mkdirSync(path.dirname(outFile), { recursive: true });
  writeFileSync(outFile, JSON.stringify(out));

  console.log(`\n  ${covered} of ${byCik.size} companies have at least one fact`);
  const perRole = {};
  for (const roles of Object.values(facts)) {
    for (const [role, list] of Object.entries(roles)) perRole[role] = (perRole[role] ?? 0) + list.length;
  }
  for (const c of CONCEPTS) {
    const n = perRole[c.role] ?? 0;
    const companies = Object.values(facts).filter((r) => r[c.role]?.length).length;
    console.log(`  ${c.role.padEnd(18)} ${String(n).padStart(7)} facts across ${String(companies).padStart(3)} companies`);
  }
  console.log(`\n  wrote data/fundamentals.json (${(statSync(outFile).size / 1024 / 1024).toFixed(1)} MB, gitignored)`);
}

main().catch((error) => {
  console.error(`fetch-fundamentals failed: ${error.message}`);
  process.exit(1);
});
