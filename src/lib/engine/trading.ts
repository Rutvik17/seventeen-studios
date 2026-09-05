/**
 * OPTIMAL TRADING WITH DECAYING ALPHA AND QUADRATIC COSTS.
 *
 * Gârleanu & Pedersen (2013), "Dynamic Trading with Predictable Returns and
 * Transaction Costs", Journal of Finance 68(6).
 *
 * ---
 * THE PROBLEM THE NO-TRADE BAND IS A GUESS AT
 *
 * The book currently rebalances to target and skips any move smaller than a
 * band. That is a reasonable heuristic and it is measurably better than trading
 * to target every time — the band is worth about two points a year. But it is a
 * guess at the shape of the right answer, and the right answer is known.
 *
 * With a signal that decays and costs that are quadratic in size, the optimal
 * policy is neither "go to target" nor "go to target unless the move is small".
 * It is:
 *
 *     move a CONSTANT FRACTION of the way toward an AIM,
 *     where the aim is a weighted average of the current target
 *     and where the target is heading next.
 *
 * Two things fall out of that which a band cannot express. Partial adjustment
 * is optimal even for large moves, because paying the whole cost now to reach a
 * target that will have moved by tomorrow is waste. And the destination is not
 * today's target: it is pulled toward where the signal is going, so the book
 * trades ahead of its own forecast rather than chasing it.
 *
 * ---
 * WHY THE CLOSED FORM IS USABLE HERE
 *
 * The full result requires a covariance matrix, a risk-aversion parameter and a
 * cost matrix. Estimating a 500x500 covariance from 250 observations is exactly
 * the regime where the estimate is mostly noise, which is a separate problem on
 * the list and not one this needs to solve first.
 *
 * So this implements the SCALAR case: each name treated independently, with its
 * own volatility as its risk term. That is the diagonal approximation, and it
 * loses the cross-name hedging the full version would find. It keeps the two
 * properties that matter — partial adjustment and the forward-looking aim — and
 * it is honest about what it drops rather than pretending to a rigour the
 * covariance estimate cannot support.
 */

export type TradingParams = {
  /**
   * How fast the signal decays, per period. 0 is a signal that vanishes
   * immediately; 1 is one that never does.
   *
   * The label is a 21-day forward return, so a position's edge is largely spent
   * after a month. Expressed per REBALANCE rather than per day, because that is
   * the clock the policy actually runs on.
   */
  decay: number;
  /** Risk aversion. Higher means a smaller book for the same signal. */
  riskAversion: number;
  /** Quadratic cost coefficient, per unit of turnover squared. */
  cost: number;
};

export const TRADING: TradingParams = {
  /*
    A 21-day label rebalanced monthly means roughly one period of usable life,
    so most of the signal is gone by the next decision. 0.35 is the survival
    fraction implied by that, and it is the parameter this is most sensitive to
    — which is why it is swept rather than asserted.
  */
  decay: 0.35,
  riskAversion: 2,
  cost: 0.5,
};

/**
 * The trading rate: what fraction of the gap to close each period.
 *
 * Gârleanu-Pedersen give this in closed form. For the scalar case with risk
 * aversion `g`, cost `c` and decay `r`, the rate solves a quadratic whose
 * positive root is:
 *
 *     a = ( -(g + c(1-r)) + sqrt((g + c(1-r))^2 + 4 g c) ) / (2c)
 *
 * The shape is what matters and it is intuitive in both limits. Costs at zero
 * give a rate of 1 — trade straight to target, because there is no reason not
 * to. Costs rising push the rate toward zero — move slowly, because every step
 * is expensive and the target will move anyway.
 */
export function tradingRate(p: TradingParams = TRADING): number {
  const { riskAversion: g, cost: c, decay: r } = p;
  if (!(c > 0)) return 1; // free trading: go straight there
  const b = g + c * (1 - r);
  const rate = (-b + Math.sqrt(b * b + 4 * g * c)) / (2 * c);
  return Math.max(0, Math.min(1, rate));
}

/**
 * The AIM: where the book should be heading, which is not today's target.
 *
 * A target built from a decaying signal is already on its way down. Aiming at
 * it means arriving at a position that is worth less than it was when the trade
 * was decided. The aim discounts the current target toward where the signal
 * will be, so the book stops chasing its own forecast.
 *
 * With geometric decay `r` and trading rate `a`, the weight on the current
 * target is `1 / (1 + a(1-r)/r)` — approaching 1 as the signal becomes
 * permanent, and shrinking as it decays faster.
 */
export function aimWeight(p: TradingParams = TRADING): number {
  const rate = tradingRate(p);
  const { decay: r } = p;
  if (!(r > 0)) return 0; // a signal with no persistence is worth nothing
  return 1 / (1 + (rate * (1 - r)) / r);
}

/**
 * One period of the optimal policy.
 *
 * `current` and `target` are weights of the book. The result is the new
 * position, not the trade — the caller subtracts.
 *
 * Note what this does NOT do: it never returns `target`, and it never returns
 * `current` unchanged. There is no band and no threshold. Every gap is closed
 * partially, including small ones, which is the part a band gets wrong in the
 * other direction — a band ignores a small gap entirely when the optimal move
 * is a small trade.
 */
export function step(
  current: number,
  target: number,
  p: TradingParams = TRADING,
): number {
  const rate = tradingRate(p);
  const w = aimWeight(p);
  // The aim shrinks the target toward zero in proportion to how fast it decays.
  const aim = target * w;
  return current + rate * (aim - current);
}

/**
 * The whole book, one period.
 *
 * Names in `targets` but not `current` open partially; names in `current` but
 * not `targets` are aimed at zero and therefore CLOSE partially rather than all
 * at once. That asymmetry is deliberate and is where a naive implementation
 * leaks turnover: closing instantly is the most expensive thing the book can
 * do, and it is what "the model no longer likes it" tempts you into.
 */
export function stepBook(
  current: Map<string, number>,
  targets: Map<string, number>,
  p: TradingParams = TRADING,
): Map<string, number> {
  const next = new Map<string, number>();
  const names = new Set([...current.keys(), ...targets.keys()]);

  for (const name of names) {
    const value = step(current.get(name) ?? 0, targets.get(name) ?? 0, p);
    // Below this a position is noise the book should not carry.
    if (Math.abs(value) > 1e-6) next.set(name, value);
  }
  return next;
}
