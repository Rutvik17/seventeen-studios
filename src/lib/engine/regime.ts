/**
 * The risk engine: how much of the book to actually carry.
 *
 * Separate from stock selection on purpose. WHICH names is the model's job and
 * HOW MUCH is this one's, and a system that conflates them cannot be tested —
 * a bad year could be bad picks or bad sizing and nothing would tell you which.
 *
 * ---
 * WHY THIS IS REACTIVE AND NOT PREDICTIVE
 *
 * The instinct is to forecast the crash. The evidence that anyone can is very
 * poor: valuation has close to zero predictive power at one-year horizons, and
 * the people who called 2000 mostly also called 1997 and missed a tripling.
 *
 * But you do not need to predict a drawdown to survive one, because large
 * drawdowns are SLOW. 2008 took fifteen months peak to trough; the dot-com
 * unwind took thirty. Noticing you are already eight percent down and getting
 * smaller captures most of the benefit and requires forecasting nothing.
 *
 * The cost is honest and worth stating: this whipsaws. It will cut exposure and
 * restore it at a worse price, repeatedly, in a choppy market. Historically that
 * runs a few points a year in exchange for roughly halving the worst drawdowns,
 * and it is the trade that makes "no losing years" reachable at all.
 *
 * ---
 * WHY SO FEW KNOBS
 *
 * Three mechanisms, four parameters. This is where a risk model goes to die: a
 * regime classifier with nine inputs will fit 2008 and 2020 beautifully and
 * generalise to nothing, because there are only a handful of genuine regime
 * changes in the whole sample to learn from. Volatility targeting and trend
 * following are the two interventions with the strongest out-of-sample record
 * across decades and asset classes, and both have one parameter each.
 */

export type RegimeOptions = {
  /** Annualised volatility the book aims to run at. */
  targetVol: number;
  /** Hard ceiling on the exposure multiplier — this is the leverage cap. */
  maxExposure: number;
  /** Exposure retained when the market is below its long-term average. */
  trendFloor: number;
  /** Book drawdown at which de-risking begins. */
  drawdownTrigger: number;
};

export const REGIME: RegimeOptions = {
  targetVol: 0.14,
  maxExposure: 1.5,
  trendFloor: 0.5,
  drawdownTrigger: 0.08,
};

export type RegimeState = {
  exposure: number;
  volScale: number;
  trendScale: number;
  drawdownScale: number;
  /** Human-readable reason, carried into the trade journal. */
  reason: string;
};

/**
 * Exposure for one day.
 *
 * `marketVol` and `belowTrend` come from the macro columns; `bookDrawdown` is
 * the strategy's own peak-to-current fall, which is the only input here that
 * depends on the strategy rather than the market.
 */
export function exposureFor(
  marketVol: number,
  belowTrend: boolean,
  bookDrawdown: number,
  options: RegimeOptions = REGIME,
): RegimeState {
  /*
    VOLATILITY TARGETING.

    Returns are close to unforecastable; volatility is strongly persistent — a
    turbulent week is followed by a turbulent week far more often than chance.
    That persistence is what makes scaling inversely to it one of the very few
    interventions that improves risk-adjusted return out of sample rather than
    only in the backtest.
  */
  const volScale = Number.isFinite(marketVol) && marketVol > 0.02
    ? Math.min(options.maxExposure, options.targetVol / marketVol)
    : 1;

  /*
    TREND. Below its long-term average, the market's distribution of forward
    returns is genuinely worse — this is the absolute-momentum result, and it
    holds across asset classes and back through a century of data.

    It is a FLOOR rather than a switch to zero because being flat is its own
    risk: the sharpest rallies happen inside downtrends, and a rule that goes to
    cash misses them entirely.
  */
  const trendScale = belowTrend ? options.trendFloor : 1;

  /*
    THE BOOK'S OWN DRAWDOWN.

    The backstop for the case the first two miss — a loss driven by the
    strategy's positions rather than by the market, which neither market
    volatility nor market trend can see. It scales down linearly from the
    trigger, so there is no cliff to sit exactly on top of.
  */
  const drawdownScale = bookDrawdown > options.drawdownTrigger
    ? Math.max(0.25, 1 - (bookDrawdown - options.drawdownTrigger) * 4)
    : 1;

  const exposure = Math.min(
    options.maxExposure,
    volScale * trendScale * drawdownScale,
  );

  const reasons: string[] = [];
  if (volScale < 0.9) reasons.push(`vol ${(marketVol * 100).toFixed(0)}%`);
  if (belowTrend) reasons.push('below 200d');
  if (drawdownScale < 1) reasons.push(`book -${(bookDrawdown * 100).toFixed(1)}%`);

  return {
    exposure,
    volScale,
    trendScale,
    drawdownScale,
    reason: reasons.length ? reasons.join(', ') : 'risk-on',
  };
}
