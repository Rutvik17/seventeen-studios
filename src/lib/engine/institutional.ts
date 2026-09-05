/**
 * Institutional ownership features, from 13F filings.
 *
 * ---
 * THE ONE RULE, AGAIN
 *
 * A 13F for the quarter ending 31 March is not public on 31 March. Managers
 * have 45 days, so that quarter becomes known around 15 May — and a model that
 * reads it in April is trading on a document nobody has filed yet.
 *
 * This is the same rule the fundamentals obey, but it has to be enforced
 * differently. A 10-Q carries the date it was accepted, so availability is a
 * fact in the file. A 13F picture is assembled from thousands of separate
 * filings that arrive over months — and stragglers keep arriving for YEARS: the
 * data has amendments for the quarter ending June 2024 that landed in May 2026,
 * a lag of 698 days. Waiting for the last one would mean the quarter never
 * becomes usable at all.
 *
 * So availability is the STATUTORY DEADLINE rather than an observed date. It is
 * conservative in the right direction — most filers land before it, so the
 * model is reading a picture that was substantially public.
 *
 * ---
 * WHY HOLDERS AND SHARES, NOT DOLLARS
 *
 * The SEC changed 13F from reporting values in thousands to whole dollars, and
 * the implied price per share reconciles against actual prices on neither side
 * of that change. Rather than guess a scale factor, everything here is built
 * from counts: how many managers hold it, and how many shares they hold between
 * them. Both are unit-free and neither moved when the reporting did.
 *
 * ---
 * WHY CHANGES, NEVER LEVELS
 *
 * "9,956 managers hold Microsoft" is a statement about Microsoft's size, which
 * the model can already see in half a dozen price features. What might carry
 * information is the DERIVATIVE: managers arriving or leaving, share counts
 * climbing or falling, and whether that is accelerating.
 *
 * Note that institutional share counts can exceed shares outstanding, because
 * 13F double-counts positions where two managers share discretion. That makes
 * the level meaningless as a fraction and the change still meaningful as a
 * direction.
 */

export type Quarter = {
  /** Quarter end, ISO. The period the filing describes. */
  period: string;
  holdings: Record<string, { shares: number; holders: number }>;
};

/**
 * The date a quarter's 13F picture may first be used.
 *
 * 45 days after the period end, per 17 CFR 240.13f-1. Computed rather than
 * read: see the note above on why the observed filing dates cannot serve.
 */
export function available13f(period: string): string {
  const d = new Date(`${period}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 45);
  return d.toISOString().slice(0, 10);
}

export const INSTITUTIONAL_COLUMNS = [
  'inst_holder_chg',
  'inst_holder_chg_2q',
  'inst_holder_accel',
  'inst_share_chg',
  'inst_share_chg_2q',
  'inst_share_accel',
  'inst_crowding',
] as const;

export type InstitutionalColumn = (typeof INSTITUTIONAL_COLUMNS)[number];

/** A quarter's numbers for one symbol, plus the two before it. */
type Window = {
  now: { shares: number; holders: number };
  prev?: { shares: number; holders: number };
  prev2?: { shares: number; holders: number };
  prev3?: { shares: number; holders: number };
};

const growth = (a: number | undefined, b: number | undefined): number => {
  if (a === undefined || b === undefined || !(b > 0)) return NaN;
  return a / b - 1;
};

/**
 * Features for one symbol from its own quarterly history.
 *
 * Everything is a ratio, so a mega-cap held by ten thousand managers and a
 * mid-cap held by four hundred are on the same scale — which is the only way a
 * cross-sectional model can compare them.
 */
export function institutionalFeatures(w: Window): Record<InstitutionalColumn, number> {
  const holderChg = growth(w.now.holders, w.prev?.holders);
  const holderChg2 = growth(w.now.holders, w.prev2?.holders);
  const shareChg = growth(w.now.shares, w.prev?.shares);
  const shareChg2 = growth(w.now.shares, w.prev2?.shares);

  // Acceleration: is the flow itself speeding up or slowing down?
  const holderPrior = growth(w.prev?.holders, w.prev2?.holders);
  const sharePrior = growth(w.prev?.shares, w.prev2?.shares);

  /*
    CROWDING. Shares held per manager, relative to a quarter ago.

    Rising means the same crowd is building bigger positions; falling means the
    position is being spread across more managers at a smaller size each. Those
    are different things and neither is visible in the two counts separately.
  */
  const per = w.now.holders > 0 ? w.now.shares / w.now.holders : NaN;
  const perPrev = w.prev && w.prev.holders > 0 ? w.prev.shares / w.prev.holders : NaN;

  return {
    inst_holder_chg: holderChg,
    inst_holder_chg_2q: holderChg2,
    inst_holder_accel: Number.isFinite(holderChg) && Number.isFinite(holderPrior)
      ? holderChg - holderPrior : NaN,
    inst_share_chg: shareChg,
    inst_share_chg_2q: shareChg2,
    inst_share_accel: Number.isFinite(shareChg) && Number.isFinite(sharePrior)
      ? shareChg - sharePrior : NaN,
    inst_crowding: Number.isFinite(per) && Number.isFinite(perPrev) && perPrev > 0
      ? per / perPrev - 1 : NaN,
  };
}

/**
 * A lookup from date to the newest quarter that was AVAILABLE on that date.
 *
 * Built once and walked forward, the same shape the fundamentals use: a pointer
 * that advances with the calendar rather than an index by period. Indexing by
 * period is what makes look-ahead easy to write and hard to see.
 */
export function availabilityIndex(quarters: Quarter[]): Array<{ from: string; at: number }> {
  return quarters
    .map((q, at) => ({ from: available13f(q.period), at }))
    .sort((a, b) => (a.from < b.from ? -1 : 1));
}

/**
 * One symbol's features on every calendar date, availability-respecting.
 *
 * Same shape and same discipline as `fundamentalFeatures`: a pointer walks
 * forward with the calendar and only ever advances onto a quarter whose
 * statutory deadline has passed. Dates before the first available quarter are
 * all NaN, which the trees route down a learned branch rather than treating as
 * zero.
 *
 * The result is STALE BY CONSTRUCTION — for most of a quarter the model is
 * looking at ownership up to four and a half months old. That is not a defect,
 * it is what a real participant sees.
 */
export function institutionalRows(
  quarters: Quarter[],
  symbol: string,
  dates: string[],
): number[][] {
  const blank = INSTITUTIONAL_COLUMNS.map(() => NaN);

  /*
    Only quarters where this symbol actually appears, in period order. A name
    absent from a quarter is a genuine gap — it was not held by anyone filing,
    or its CUSIP did not match — and skipping it keeps "previous quarter" the
    previous quarter WITH DATA rather than a hole that silently becomes a
    two-quarter change labelled as one.
  */
  const mine = quarters
    .filter((q) => q.holdings[symbol])
    .sort((a, b) => (a.period < b.period ? -1 : 1))
    .map((q) => ({ available: available13f(q.period), ...q.holdings[symbol] }));

  if (!mine.length) return dates.map(() => blank.slice());

  const out: number[][] = [];
  let cursor = -1;

  for (const date of dates) {
    while (cursor + 1 < mine.length && mine[cursor + 1].available <= date) cursor += 1;
    if (cursor < 0) { out.push(blank.slice()); continue; }

    const f = institutionalFeatures({
      now: mine[cursor],
      prev: mine[cursor - 1],
      prev2: mine[cursor - 2],
      prev3: mine[cursor - 3],
    });
    out.push(INSTITUTIONAL_COLUMNS.map((c) => f[c]));
  }
  return out;
}
