/**
 * The book: turning predictions into positions, and positions into a record.
 *
 * ---
 * WHY CONVICTION AND NOT RANK
 *
 * The obvious construction takes the top N names and equal-weights them. It
 * throws away the only thing the model actually said. A prediction of +4% and a
 * prediction of +0.2% are both "top decile" on a day when nothing looks good,
 * and betting the same size on each is a decision the model did not make.
 *
 * Nothing in markets is predictable enough to bet flat. Size scales with the
 * prediction's distance from that day's cross-sectional mean, measured in that
 * day's own dispersion — so a day where every name looks identical produces a
 * small book, and a day with real separation produces a large one. The model is
 * allowed to say "I do not know", and saying it costs nothing.
 *
 * ---
 * WHY THE SHORT SIDE IS GATED DIFFERENTLY FROM THE LONG SIDE
 *
 * The previous book was dollar-neutral: always 100% long and 100% short, with
 * the short leg taken from the bottom of the same ranking that picked the longs.
 * It lost to its own universe by a wide margin, and the reason was structural
 * rather than bad luck.
 *
 *   - It was FORCED to be short. In a rising market that is a permanent tax paid
 *     whether or not anything deserved shorting.
 *   - It assumed the signals identifying winners are the mirror of those
 *     identifying losers. They are not.
 *   - A short's loss is unbounded and a long's is capped at the position.
 *
 * So shorts here must clear a HIGHER bar than longs, are capped smaller, and the
 * count is variable — including zero, which is the correct answer most of the
 * time in a bull market. Market exposure is managed with the index, which cannot
 * squeeze, rather than by shorting individual companies.
 */

export type BookOptions = {
  /** Largest fraction of capital in any one long. */
  maxLong: number;
  /** Largest fraction in any one short. Deliberately smaller. */
  maxShort: number;
  /** Longs must beat this many cross-sectional standard deviations. */
  longThreshold: number;
  /** Shorts must clear this many, and it is higher on purpose. */
  shortThreshold: number;
  /** Ceiling on gross exposure before the regime multiplier. */
  maxGross: number;
  /** Ceiling on net long exposure before the regime multiplier. */
  maxNet: number;
  /** Round-trip cost per unit traded, in basis points. */
  costBps: number;
  /** Annual borrow cost charged on short positions, in basis points. */
  borrowBps: number;
  /**
   * Ceiling on the number of long positions. Infinity holds everything that
   * clears the threshold.
   *
   * The threshold alone decides how SELECTIVE the book is in units of
   * conviction, which is the statistically natural cut — but it does not decide
   * how MANY names that turns out to be, and that number swings with how spread
   * the day's scores happen to be. This makes the count an explicit choice
   * rather than a consequence of one.
   */
  maxNames: number;
};

export const BOOK: BookOptions = {
  /*
    THE CAP MOVES WITH THE COUNT, OR CONCENTRATION JUST MEANS HOLDING LESS.

    This was 0.04, sized for a book of ninety-five names. Cutting the count to
    fifteen without touching it produced exactly the failure it looks like it
    would not: fifteen names at a 4% ceiling is 60 cents in the dollar, and the
    first run of the concentrated book came back at 11.1% a year — not because
    the names were worse but because a fifth of the account was in cash.

    `sweep-concentration.mjs` uses min(0.22, max(0.04, 2.4 / n)), and 2.4/15 is
    the 0.16 here. The two numbers are one decision and have to be changed
    together.
  */
  maxLong: 0.16,
  maxShort: 0.02,
  longThreshold: 0.5,
  shortThreshold: 1.2,
  maxGross: 1.5,
  maxNet: 1.0,
  costBps: 10,
  borrowBps: 50,
  /*
    FIFTEEN, WHICH IS A CHOICE AND NOT THE OPTIMUM.

    Unlimited is the best book by every risk-adjusted measure — 95 positions,
    Sharpe 0.97, a 19.1% worst drawdown — and it is also indistinguishable from
    an index fund, which is not what this account is for. A book nobody could
    hold by hand is a strange thing to present as a manager's book.

    Fifteen is a deliberate underperformance, chosen with the number in view.
    The sweep, `npm run concentration -- --pointInTime`:

        names   held   $10k ->    annual   Sharpe   maxDD   vs SPY
            8      8   $30,303      8.5%     0.58   30.1%    -6.4%
           15     16   $53,358     13.1%     0.78   25.5%    -1.8%
           20     22   $69,399     15.3%     0.88   24.3%    +0.4%
           30     34   $67,264     15.0%     0.87   22.5%    +0.2%
        unltd     95   $73,933     15.8%     0.97   19.1%    +1.0%

    Fifteen LOSES to the index by 1.8 points a year, and that is the trade
    being made rather than an oversight. Ninety-five names is the better book
    by every risk-adjusted measure and is also indistinguishable from an index
    fund; this account is presented as a manager's book, and a manager does not
    hold ninety-five names. The brief was seven to fifteen. Fifteen is the top
    of that range and the best point in it — eight names lose by 6.4 points
    with a worse drawdown than the index.

    Why the curve slopes this way is not taste, it is Grinold: IR is roughly
    IC x sqrt(breadth), and at an IC of 0.022 the top eight scores are not
    reliably the best eight. Concentration is a bet on conviction and a thin
    edge has none to spend. Raise the IC and this number can fall — which is
    what the `selected` panel is for.
  */
  maxNames: 15,
};

export type Candidate = {
  symbol: string;
  /** Predicted excess return over the benchmark. */
  score: number;
  /** Trailing volatility, for inverse-risk sizing. NaN falls back to flat. */
  volatility: number;
};

export type Target = {
  symbol: string;
  weight: number;
  score: number;
  /** How many cross-sectional deviations from the day's mean. */
  conviction: number;
};

/**
 * Target weights for one rebalance.
 *
 * `exposure` is the regime engine's multiplier: 1 is fully invested, 0.5 is
 * half, 0 is cash. It scales the whole book rather than changing the selection,
 * which keeps two decisions separate — WHICH names is the model's job, HOW MUCH
 * is the risk engine's, and conflating them makes both untestable.
 */
export function buildTargets(
  candidates: Candidate[],
  exposure: number,
  options: BookOptions = BOOK,
): Target[] {
  const scores = candidates.map((c) => c.score).filter(Number.isFinite);
  if (scores.length < 20) return [];

  const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
  const sd = Math.sqrt(
    scores.reduce((s, v) => s + (v - mean) ** 2, 0) / (scores.length - 1),
  );
  if (!(sd > 0)) return [];

  /*
    Inverse-volatility sizing within each side.

    Two names the model likes equally are not the same bet if one moves twice as
    much. Sizing by conviction alone would let the most volatile names dominate
    the book's risk while contributing the same expected return — the position
    would be large in the thing that is uncertain, which is backwards.
  */
  const sized = candidates
    .map((c) => {
      const conviction = (c.score - mean) / sd;
      const long = conviction >= options.longThreshold;
      const short = conviction <= -options.shortThreshold;
      if (!long && !short) return null;

      const vol = Number.isFinite(c.volatility) && c.volatility > 0.05 ? c.volatility : 0.30;
      const risk = 0.30 / vol;
      const cap = long ? options.maxLong : options.maxShort;
      const raw = Math.min(cap, Math.abs(conviction) * risk * cap * 0.6);

      return { symbol: c.symbol, weight: long ? raw : -raw, score: c.score, conviction };
    })
    .filter((t): t is Target => t !== null);

  if (!sized.length) return [];

  /*
    CONCENTRATION.

    Keep the highest-conviction names and drop the tail. This runs AFTER sizing
    and before the gross normalisation below, so the survivors are rescaled to
    the same total exposure — cutting the book from ninety names to fifteen
    makes each of the fifteen larger rather than leaving the account in cash.

    Longs and shorts are capped separately. A single ceiling would let a day
    with many good longs crowd out every short, which changes what the book IS
    rather than how concentrated it is.
  */
  if (Number.isFinite(options.maxNames)) {
    const byConviction = (a: Target, b: Target) => Math.abs(b.weight) - Math.abs(a.weight);
    const longs = sized.filter((t) => t.weight > 0).sort(byConviction).slice(0, options.maxNames);
    // Shorts get a third of the budget, matching their smaller cap and higher bar.
    const shortRoom = Math.max(1, Math.round(options.maxNames / 3));
    const shorts = sized.filter((t) => t.weight < 0).sort(byConviction).slice(0, shortRoom);
    sized.length = 0;
    sized.push(...longs, ...shorts);
  }

  if (!sized.length) return [];

  /*
    Constraints applied in the order that leaves them all satisfied.

    Gross first, because scaling for gross would otherwise undo a net
    adjustment; net second, by trimming the side that is too large rather than
    by shifting every weight — a uniform shift is what previously pushed
    bottom-ranked names back above zero and left a long-only book holding
    companies it scored worst.
  */
  let gross = sized.reduce((s, t) => s + Math.abs(t.weight), 0);
  const grossCap = options.maxGross * exposure;
  if (gross > grossCap && gross > 0) {
    const k = grossCap / gross;
    for (const t of sized) t.weight *= k;
  }

  const net = sized.reduce((s, t) => s + t.weight, 0);
  const netCap = options.maxNet * exposure;
  if (net > netCap) {
    const longs = sized.filter((t) => t.weight > 0);
    const longSum = longs.reduce((s, t) => s + t.weight, 0);
    if (longSum > 0) {
      const k = Math.max(0, (netCap - (net - longSum)) / longSum);
      for (const t of longs) t.weight *= k;
    }
  }

  return sized.filter((t) => Math.abs(t.weight) > 1e-6);
}

export type Trade = {
  date: string;
  symbol: string;
  /** Positive opens or adds to a long; negative to a short. */
  deltaWeight: number;
  price: number;
  side: 'open' | 'add' | 'trim' | 'close' | 'flip';
  conviction: number;
};

/** What has to be traded to move from `held` to `targets`. */
export function diffBook(
  held: Map<string, number>,
  targets: Target[],
  date: string,
  priceOf: (symbol: string) => number,
): Trade[] {
  const want = new Map(targets.map((t) => [t.symbol, t]));
  const names = new Set([...held.keys(), ...want.keys()]);
  const trades: Trade[] = [];

  for (const symbol of names) {
    const from = held.get(symbol) ?? 0;
    const to = want.get(symbol)?.weight ?? 0;
    const delta = to - from;
    // Below a basis point the commission exceeds the point of the trade.
    if (Math.abs(delta) < 1e-4) continue;

    const price = priceOf(symbol);
    if (!(price > 0)) continue;

    let side: Trade['side'];
    if (from === 0) side = 'open';
    else if (to === 0) side = 'close';
    else if (Math.sign(from) !== Math.sign(to)) side = 'flip';
    else side = Math.abs(to) > Math.abs(from) ? 'add' : 'trim';

    trades.push({
      date,
      symbol,
      deltaWeight: delta,
      price,
      side,
      conviction: want.get(symbol)?.conviction ?? 0,
    });
  }
  return trades;
}

/** Cost of a set of trades, plus a day's borrow on the short book. */
export function frictionCost(
  trades: Trade[],
  shortWeight: number,
  options: BookOptions = BOOK,
): number {
  const traded = trades.reduce((s, t) => s + Math.abs(t.deltaWeight), 0);
  const commission = (traded * options.costBps) / 10_000;
  // Borrow accrues daily; the annual rate is spread across the trading year.
  const borrow = (Math.abs(shortWeight) * options.borrowBps) / 10_000 / 252;
  return commission + borrow;
}
