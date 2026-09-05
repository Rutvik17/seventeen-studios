/**
 * The circular-financing graph, as features.
 *
 * ---
 * WHAT THE GRAPH SAYS
 *
 * Twenty-one non-financial S&P 500 companies file 13Fs, and what they hold is
 * not a portfolio. NVIDIA owns $17.4bn of Intel, $5.4bn of CoreWeave, $4.2bn of
 * Synopsys and $1.9bn of Coherent — a chip maker holding equity in its
 * customers, its suppliers and its design-tool vendor. Amazon owns Rivian, whose
 * vans it buys. Uber owns Grab and Aurora. Walmart owns Symbotic, which
 * automates its warehouses.
 *
 * None of that is improper and nobody suggests it is. It is a reason to think
 * two things a model treats as independent are not: a supplier's revenue and its
 * customer's balance sheet are the same money going round, and a stake taken in
 * a customer can fund the order that becomes the supplier's growth.
 *
 * ---
 * WHY THIS IS A FEATURE ABOUT THE NODE, NOT THE EDGE
 *
 * The interesting quantity is not "NVIDIA owns Intel". It is what that says
 * about NVIDIA — and separately about Intel.
 *
 * For the HOLDER, it is exposure: how much of its own market value sits in
 * other listed companies rather than in its operations. A company whose equity
 * portfolio is a tenth of its size has a second business it does not describe
 * as one, and its earnings will move with a market it does not control.
 *
 * For the HELD, it is dependence: how much of its register belongs to
 * corporates rather than to funds. A company substantially owned by its own
 * customer is not independent of that customer's demand, and a fall in the
 * customer's fortunes arrives twice.
 *
 * ---
 * IT IS POINT-IN-TIME NOW, AND IT WAS NOT
 *
 * The first version built ONE graph from recent quarters and applied it to all
 * history, so it said NVIDIA held CoreWeave in 2015 — a fact about the present
 * used as though it had been known in the past. That is the same class of error
 * as the survivorship bias this project spent a week measuring.
 *
 * Edges now carry the quarter they were filed for, and `graphAsOf` returns only
 * those whose 45-day statutory deadline had passed. Same rule the ownership
 * features obey, and for the same reason: these edges come out of the same 13F
 * filings, so they become public on the same day.
 *
 * Verified by walking it forward — on 2025-06-01 the graph is EMPTY, and
 * NVIDIA's stake count climbs 0 -> 6 -> 9 -> 11 as filings actually arrive.
 *
 * An edge with no period is DROPPED rather than assumed always-available,
 * because that default is precisely what would quietly restore the old
 * behaviour.
 */

export type CircularEdge = {
  /** Quarter end. SEC filings use `31-MAR-2026`; normalised on read. */
  period?: string;
  /** Ticker of the company that FILED — the holder. */
  from: string;
  /** Issuer name as reported in the filing. There is no ticker in a 13F. */
  to: string;
  /** Dollars, as reported. */
  value: number;
};

export const CIRCULAR_COLUMNS = [
  'circ_holds_count',
  'circ_holds_value_log',
  'circ_held_by_count',
  'circ_held_by_value_log',
] as const;

export type CircularColumn = (typeof CIRCULAR_COLUMNS)[number];

/**
 * The graph reduced to a per-company lookup.
 *
 * Held-by is matched on ISSUER NAME, because a 13F identifies what it holds by
 * CUSIP and name, never by ticker. That is the same fuzzy join the ownership
 * fetcher had to make, with the same rule: an unmatched name is dropped rather
 * than guessed at, because inventing a financial relationship between two
 * companies is a considerably worse error than missing one.
 */
export function circularIndex(
  edges: CircularEdge[],
  universe: Array<{ symbol: string; name: string }>,
) {
  const holds = new Map<string, { count: number; value: number }>();
  const heldBy = new Map<string, { count: number; value: number }>();

  /*
    THE SAME TOKEN JOIN THE OWNERSHIP FETCHER USES, and for the same reason.

    An exact normalised match found ONE edge of 174: "INTEL CORP" and "Intel"
    collapse to INTELCORP and INTEL, which are not equal — so the single largest
    edge in the graph was invisible.

    Corporate suffixes are dropped and every remaining token of OUR name must
    appear in the issuer's. A single-token name is only matched against a short
    issuer name, which is the guard that stopped A-O-N being read as a
    subsequence of AMAZON when this join was first written for 13F.
  */
  const STOP = new Set(['INC', 'CORP', 'CORPORATION', 'CO', 'COMPANY', 'CLASS', 'CL', 'COM',
    'LTD', 'LLC', 'PLC', 'HLDG', 'HOLDINGS', 'HLDGS', 'THE', 'NEW', 'SA', 'NV', 'AG',
    'TRUST', 'GROUP', 'GRP', 'INTERNATIONAL', 'INTL', 'AND']);

  const tokens = (s: string) => s.toUpperCase().replace(/[^A-Z0-9 ]/g, ' ').split(/\s+/)
    .filter((t) => t && !STOP.has(t));

  const targets = universe
    .map((u) => ({ symbol: u.symbol, t: tokens(u.name) }))
    .filter((u) => u.t.length);

  const match = (issuer: string): string | null => {
    const it = new Set(tokens(issuer));
    if (!it.size) return null;
    for (const u of targets) {
      // A lone token inside a long issuer name is a coincidence, not a company.
      if (u.t.length === 1 && it.size > 3) continue;
      if (u.t.every((tok) => it.has(tok))) return u.symbol;
    }
    return null;
  };

  for (const e of edges) {
    const h = holds.get(e.from) ?? { count: 0, value: 0 };
    h.count += 1;
    h.value += e.value;
    holds.set(e.from, h);

    const target = match(e.to);
    if (!target) continue;
    const t = heldBy.get(target) ?? { count: 0, value: 0 };
    t.count += 1;
    t.value += e.value;
    heldBy.set(target, t);
  }

  return { holds, heldBy };
}

/**
 * Four columns for one company.
 *
 * Values are log-scaled. The raw range spans $17bn to a few million, and a tree
 * splitting on that spends its capacity separating NVIDIA from everyone rather
 * than separating "has meaningful corporate stakes" from "has none" — which is
 * the distinction the graph is for.
 */
export function circularFeatures(
  symbol: string,
  index: ReturnType<typeof circularIndex>,
): Record<CircularColumn, number> {
  const h = index.holds.get(symbol);
  const t = index.heldBy.get(symbol);
  // log1p keeps zero at zero, which is the common and meaningful case here.
  const log = (v: number | undefined) => (v && v > 0 ? Math.log1p(v / 1e9) : 0);

  return {
    circ_holds_count: h?.count ?? 0,
    circ_holds_value_log: log(h?.value),
    circ_held_by_count: t?.count ?? 0,
    circ_held_by_value_log: log(t?.value),
  };
}

/* ------------------------------------------------------- point-in-time */

const MONTH3: Record<string, string> = {
  JAN: '01', FEB: '02', MAR: '03', APR: '04', MAY: '05', JUN: '06',
  JUL: '07', AUG: '08', SEP: '09', OCT: '10', NOV: '11', DEC: '12',
};

/**
 * `31-MAR-2026` to `2026-03-31`, tolerating either form.
 *
 * The SEC writes periods as `31-MAR-2026` and everything else in this project
 * compares dates as ISO strings. Accepting both here rather than at the fetcher
 * means a cached file in the old shape still works.
 */
export function periodToIso(period: string | undefined): string | null {
  if (!period) return null;
  const iso = /^\d{4}-\d{2}-\d{2}$/.exec(period.trim());
  if (iso) return period.trim();
  const m = /^(\d{2})-([A-Z]{3})-(\d{4})$/.exec(period.trim().toUpperCase());
  return m ? `${m[3]}-${MONTH3[m[2]]}-${m[1]}` : null;
}

/**
 * When a quarter's graph may first be used.
 *
 * The same 45-day statutory deadline the ownership features obey — these edges
 * come from the same 13F filings, so they become public on the same day. Using
 * a stake before its filing is the leak that made the static version unusable
 * for anything trained across time.
 */
export function availableFrom(period: string | undefined): string | null {
  const iso = periodToIso(period);
  if (!iso) return null;
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 45);
  return d.toISOString().slice(0, 10);
}

/**
 * The graph as it stood on a given date.
 *
 * Only edges whose quarter was already public are included, so the features
 * built from it are point-in-time rather than a fact about the present applied
 * backwards. Edges with no period at all are DROPPED rather than assumed
 * always-available — an undated stake is exactly the thing that made the first
 * version say NVIDIA held CoreWeave in 2015.
 */
export function graphAsOf(edges: CircularEdge[], date: string): CircularEdge[] {
  const latest = new Map<string, CircularEdge>();
  for (const e of edges) {
    const from = availableFrom(e.period);
    if (!from || from > date) continue;
    // The most recent quarter that was public: a stake is a level, not a flow.
    const key = `${e.from}|${e.to}`;
    const held = latest.get(key);
    if (!held || (periodToIso(e.period) ?? '') > (periodToIso(held.period) ?? '')) {
      latest.set(key, e);
    }
  }
  return [...latest.values()];
}
