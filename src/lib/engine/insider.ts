/**
 * Insider transaction features, from Form 4.
 *
 * ---
 * WHY THIS FAMILY IS DIFFERENT FROM THE OTHERS
 *
 * Every other feature here is derived from something that happened TO a
 * company — its price moved, its filings changed, rates rose. Form 4 is the
 * only place where someone with a legal duty to know the business puts their
 * own money behind a view about it.
 *
 * It is also the freshest data in the project. A 13F is 45 days stale before it
 * may be used; a Form 4 is due within two business days of the trade.
 *
 * ---
 * BUYING AND SELLING ARE NOT SYMMETRIC, AND THAT IS THE WHOLE POINT
 *
 * Insiders sell for reasons that have nothing to do with the stock: a house, a
 * divorce, a diversification rule, a 10b5-1 plan written months earlier. Sales
 * outnumber purchases roughly three to one in every quarter of this dataset,
 * because executives are PAID in stock and have to convert it to live on.
 *
 * A purchase has no such excuse. An officer buying on the open market with
 * after-tax money has one reason to do it. So the features keep buying and
 * selling apart rather than netting them into one number — netting would let a
 * routine sale cancel a meaningful purchase, and the two are not the same
 * quantity with opposite signs.
 *
 * ---
 * WHY EVENT COUNTS, NOT DOLLARS
 *
 * The dollar distribution is violently heavy-tailed: median $343k, ninety-ninth
 * percentile $99M, maximum $7.6bn. Those extremes are real — a 10% holder
 * exiting an acquired company — but they are facts about ownership structure,
 * not about the stock's prospects, and a tree splitting on raw value would
 * spend its capacity on them.
 *
 * Counts of DISTINCT FILERS are bounded, comparable across a mega-cap and a
 * mid-cap, and closer to what the signal is supposed to be: how many people who
 * know the business are acting, and in which direction.
 */

export type InsiderEvent = {
  symbol: string;
  /** FILING date, not transaction date — when the market could see it. */
  date: string;
  buy: number;
  sell: number;
  buyers: number;
  sellers: number;
  /** Seniority-weighted net direction: officers count more than directors. */
  weight: number;
};

export const INSIDER_COLUMNS = [
  'insider_buyers_63',
  'insider_sellers_63',
  'insider_net_63',
  'insider_weighted_63',
  'insider_buy_ratio_63',
  'insider_buyers_21',
  'insider_cluster',
  'insider_days_since_buy',
] as const;

export type InsiderColumn = (typeof INSIDER_COLUMNS)[number];

/*
  A quarter and a month. Insider activity is sparse — a given name has a filing
  on a handful of days a year — so a one-day window would be almost entirely
  zero and carry nothing. Sixty-three trading days is a quarter, long enough to
  accumulate a picture; twenty-one is a month, which is what makes a CLUSTER
  visible against that background.
*/
const LONG = 63;
const SHORT = 21;

/** How long "no purchase yet" is worth saying. Beyond this it stops mattering. */
const STALE = 252;

/**
 * One symbol's features on every calendar date.
 *
 * Events are keyed by filing date, so a window ending on date D contains only
 * things the market had already seen. No lag needs adding on top: unlike a 13F,
 * the availability date IS the date in the record.
 */
export function insiderRows(
  events: InsiderEvent[],
  symbol: string,
  dates: string[],
): number[][] {
  const blank = INSIDER_COLUMNS.map(() => 0);

  const mine = events
    .filter((e) => e.symbol === symbol)
    .sort((a, b) => (a.date < b.date ? -1 : 1));

  /*
    Zero rather than NaN, and the distinction matters.

    A missing fundamental means the company did not report the line. No insider
    filings means no insider traded — which is itself the observation, and the
    common case. Encoding it as NaN would tell the trees "unknown" when the
    truth is "none".
  */
  if (!mine.length) return dates.map(() => blank.slice());

  const out: number[][] = [];
  let head = 0;

  // Ring of indices currently inside the long window.
  let windowStart = 0;

  for (let t = 0; t < dates.length; t++) {
    const date = dates[t];
    while (head < mine.length && mine[head].date <= date) head += 1;

    /*
      The window is in TRADING DAYS, so its start is an index into `dates`
      rather than a calendar subtraction. A 63-calendar-day window would be a
      different length depending on how many holidays it spanned.
    */
    const fromLong = dates[Math.max(0, t - LONG)];
    const fromShort = dates[Math.max(0, t - SHORT)];
    while (windowStart < head && mine[windowStart].date < fromLong) windowStart += 1;

    let buyers = 0;
    let sellers = 0;
    let weighted = 0;
    let buyersShort = 0;
    let lastBuy = -1;

    for (let k = windowStart; k < head; k++) {
      const e = mine[k];
      buyers += e.buyers;
      sellers += e.sellers;
      weighted += e.weight;
      if (e.date >= fromShort) buyersShort += e.buyers;
    }

    // Days since the most recent purchase, over the whole history not the window.
    for (let k = head - 1; k >= 0; k--) {
      if (mine[k].buyers > 0) {
        lastBuy = Math.round((Date.parse(date) - Date.parse(mine[k].date)) / 86_400_000);
        break;
      }
    }

    const total = buyers + sellers;
    out.push([
      buyers,
      sellers,
      buyers - sellers,
      weighted,
      /*
        The share of filers who were buying. Undefined with no activity, which
        is 0.5 here rather than NaN — "no information" sits between "everyone
        selling" and "everyone buying" rather than off the scale.
      */
      total > 0 ? buyers / total : 0.5,
      buyersShort,
      /*
        CLUSTER. Recent buying against the quarter's background.

        One officer buying is a data point; three buying in a month when the
        quarter had four is a cluster, and clustered purchases are the part of
        this literature that has held up. Expressed as the share of the
        quarter's buyers who acted in the last month.
      */
      buyers > 0 ? buyersShort / buyers : 0,
      // Capped, because "no purchase in four years" and "in six" are the same.
      lastBuy < 0 ? STALE : Math.min(lastBuy, STALE),
    ]);
  }
  return out;
}
