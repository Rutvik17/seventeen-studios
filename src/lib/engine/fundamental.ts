/**
 * Fundamental features: what the filings say about the business.
 *
 * ---
 * THE ONE RULE
 *
 * A fact may be used on date D only if it was PUBLISHED by date D. Every fact
 * carries `from`, the date it became available, and the walk below advances a
 * pointer per concept as the calendar moves rather than indexing by period. Get
 * this wrong and the model trades on earnings before they are announced, which
 * is the single most valuable piece of information in the file and the easiest
 * to leak.
 *
 * The consequence is that these features are STALE by construction — for most of
 * a quarter the model is looking at numbers up to four months old. That is not a
 * defect, it is what a real participant sees.
 *
 * ---
 * WHY RATIOS AND CHANGES, NEVER LEVELS
 *
 * A revenue of $26bn is not a feature. It says the company is large, which the
 * model can already see, and it is not comparable to anything. What carries
 * information is the change, the acceleration, and the ratio to something else
 * in the same filing — growth rates and margins are unit-free and comparable
 * across a semiconductor and a supermarket.
 *
 * ---
 * WHY THE SHORT-SIDE FEATURES ARE DIFFERENT ONES
 *
 * The signals that identify a good long are not the mirror of those identifying
 * a good short — that assumption is exactly what sank the previous book, which
 * shorted whatever ranked worst on a long model and lost 28 points doing it.
 *
 * Deterioration has its own tells and they are mostly accounting: accruals
 * running ahead of cash, inventory and receivables growing faster than the
 * revenue that is supposed to justify them, dilution, leverage climbing while
 * coverage falls. Those are computed here as first-class features rather than as
 * negated long signals.
 */

export type Fact = {
  /** Period end. */
  end: string;
  val: number;
  /** The date this may first be used. */
  from: string;
  tag: string;
};

export type Facts = Record<string, Fact[]>;

/** A concept's value now, four quarters ago, and eight quarters ago. */
type Window = {
  now: number;
  prev: number;
  year: number;
  twoYear: number;
};

const NA: Window = { now: NaN, prev: NaN, year: NaN, twoYear: NaN };

/** Growth, guarded so a sign flip through zero does not produce nonsense. */
function growth(a: number, b: number): number {
  if (!Number.isFinite(a) || !Number.isFinite(b)) return NaN;
  // A denominator at or below zero makes a percentage change meaningless: a
  // company going from -$1m to +$1m has not grown by -200%.
  if (!(b > 0)) return NaN;
  return a / b - 1;
}

function ratio(a: number, b: number): number {
  if (!Number.isFinite(a) || !Number.isFinite(b) || b === 0) return NaN;
  return a / b;
}

export const FUNDAMENTAL_COLUMNS = [
  // Growth and its second derivative — the shape of the business.
  'rev_growth_yoy', 'rev_accel', 'rev_growth_qoq',
  // Where the money goes. The core of the capex thesis.
  'capex_to_rev', 'capex_growth', 'capex_accel',
  'rnd_to_rev', 'rnd_growth',
  // Profitability and its direction.
  'gross_margin', 'gross_margin_delta', 'op_margin', 'op_margin_delta',
  'roe', 'roa', 'asset_turnover',
  // Earnings quality. High accruals mean profit the cash never arrived for.
  'accruals', 'cash_conversion',
  // Demand deterioration: stock and unpaid bills outrunning sales.
  'inventory_vs_rev', 'receivables_vs_rev',
  // Balance sheet stress.
  'debt_to_equity', 'debt_growth', 'cash_to_assets',
  // What management does with the money.
  'buyback_yield', 'share_change',
  // Stakes taken in other public companies — the circular-financing leg.
  'equity_stakes_to_rev',
] as const;

/**
 * Every fundamental column for one company, aligned to `dates`.
 *
 * `dates` is the shared trading calendar. Rows before the company's first
 * available filing are all NaN, which the trees route down a learned branch.
 */
export function fundamentalFeatures(facts: Facts, dates: string[]): number[][] {
  const roles = Object.keys(facts);

  /*
    A cursor per concept, advanced as the calendar moves.

    The alternative — scanning each concept's history at every date — is
    O(dates x facts) per company and this is O(dates + facts). With 4,207 dates
    and 500 companies that is the difference between a build that finishes and
    one that does not.
  */
  const cursor: Record<string, number> = {};
  for (const role of roles) cursor[role] = 0;

  /** Values known as of the current date, most recent first. */
  const known: Record<string, Fact[]> = {};
  for (const role of roles) known[role] = [];

  const out: number[][] = [];

  for (const date of dates) {
    for (const role of roles) {
      const list = facts[role];
      while (cursor[role] < list.length && list[cursor[role]].from <= date) {
        known[role].unshift(list[cursor[role]]);
        cursor[role]++;
      }
    }

    const w = (role: string): Window => {
      const k = known[role];
      if (!k?.length) return NA;
      return {
        now: k[0]?.val ?? NaN,
        prev: k[1]?.val ?? NaN,
        year: k[4]?.val ?? NaN,
        twoYear: k[8]?.val ?? NaN,
      };
    };

    const rev = w('revenue');
    const capex = w('capex');
    const rnd = w('rnd');
    const gross = w('grossProfit');
    const op = w('operatingIncome');
    const net = w('netIncome');
    const ocf = w('operatingCashFlow');
    const inv = w('inventory');
    const rec = w('receivables');
    const assets = w('assets');
    const equity = w('equity');
    const debt = w('debt');
    const cash = w('cash');
    const shares = w('shares');
    const buyback = w('buybacks');
    const stakes = w('equityStakes');

    const revYoY = growth(rev.now, rev.year);
    const revPrevYoY = growth(rev.prev, rev.twoYear);
    const capexYoY = growth(capex.now, capex.year);
    const capexPrevYoY = growth(capex.prev, capex.twoYear);

    const grossMargin = ratio(gross.now, rev.now);
    const grossMarginPrev = ratio(gross.year, rev.year);
    const opMargin = ratio(op.now, rev.now);
    const opMarginPrev = ratio(op.year, rev.year);

    out.push([
      revYoY,
      // Acceleration: is growth itself speeding up or slowing down. A company
      // growing 30% having grown 50% is a different story from one growing 30%
      // having grown 10%, and the level alone cannot tell them apart.
      Number.isFinite(revYoY) && Number.isFinite(revPrevYoY) ? revYoY - revPrevYoY : NaN,
      growth(rev.now, rev.prev),

      ratio(capex.now, rev.now),
      capexYoY,
      Number.isFinite(capexYoY) && Number.isFinite(capexPrevYoY) ? capexYoY - capexPrevYoY : NaN,

      ratio(rnd.now, rev.now),
      growth(rnd.now, rnd.year),

      grossMargin,
      Number.isFinite(grossMargin) && Number.isFinite(grossMarginPrev) ? grossMargin - grossMarginPrev : NaN,
      opMargin,
      Number.isFinite(opMargin) && Number.isFinite(opMarginPrev) ? opMargin - opMarginPrev : NaN,

      ratio(net.now, equity.now),
      ratio(net.now, assets.now),
      ratio(rev.now, assets.now),

      /*
        Accruals: profit that cash did not arrive for.

        Sloan's result, and one of the most durable in the literature — the
        portion of earnings not backed by operating cash flow reverses, and
        companies at the top of this measure underperform. It is a short signal
        that has nothing to do with price.
      */
      ratio(net.now - ocf.now, assets.now),
      ratio(ocf.now, net.now),

      /*
        Inventory and receivables against revenue.

        Stock piling up faster than sales means demand rolled over before the
        income statement admitted it. Receivables outrunning revenue means sales
        were booked that nobody has paid for yet — the classic shape of channel
        stuffing. Both lead reported earnings.
      */
      Number.isFinite(growth(inv.now, inv.year)) && Number.isFinite(revYoY)
        ? growth(inv.now, inv.year) - revYoY : NaN,
      Number.isFinite(growth(rec.now, rec.year)) && Number.isFinite(revYoY)
        ? growth(rec.now, rec.year) - revYoY : NaN,

      ratio(debt.now, equity.now),
      growth(debt.now, debt.year),
      ratio(cash.now, assets.now),

      ratio(buyback.now, rev.now),
      // Negative is buybacks shrinking the count; positive is dilution.
      growth(shares.now, shares.year),

      ratio(stakes.now, rev.now),
    ]);
  }

  if (out.length && out[0].length !== FUNDAMENTAL_COLUMNS.length) {
    throw new Error(
      `fundamental: ${out[0].length} columns but ${FUNDAMENTAL_COLUMNS.length} names`,
    );
  }
  return out;
}
