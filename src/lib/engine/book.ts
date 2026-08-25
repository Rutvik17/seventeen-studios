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
};

export const BOOK: BookOptions = {
  maxLong: 0.04,
  maxShort: 0.02,
  longThreshold: 0.5,
  shortThreshold: 1.2,
  maxGross: 1.5,
  maxNet: 1.0,
  costBps: 10,
  borrowBps: 50,
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
