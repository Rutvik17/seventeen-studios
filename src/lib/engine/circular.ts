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
 * WHY IT IS STATIC, AND WHY THAT IS SAID PLAINLY
 *
 * The graph is built from the most recent quarters, and applied to the whole
 * history. It is therefore NOT point-in-time: NVIDIA did not hold CoreWeave in
 * 2015, and this will say it did.
 *
 * That is a real limitation and it is the reason these features are quarantined
 * behind their own flag rather than folded into the panel by default. They
 * describe a structural fact about the present, which is legitimate for
 * reasoning about today's book and a leak for anything trained across time. The
 * honest version needs the graph rebuilt per quarter, which the fetcher can do
 * and 53 quarters of downloads has not been spent on yet.
 */

export type CircularEdge = {
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
