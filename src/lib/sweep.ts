/**
 * The liquidity-sweep model, as a testable function.
 *
 * A weekly setup, an intraday trap, and a rule for what to do about it. The
 * whole strategy is here as pure arithmetic over bars — no React, no charting,
 * no data fetching — so the numbers on the page and the numbers in a test are
 * produced by the same code.
 *
 * ---
 *
 * THE IDEA, IN MARKET TERMS
 *
 * A large seller cannot fill a block order into a quiet market without moving
 * the price against themselves. They need someone to sell to, in size, at a
 * price they like. Resting buy orders are that someone.
 *
 * The setup this looks for is the arrangement that concentrates them. Thursday
 * makes a local high and is rejected. Friday tries and fails to beat it, closing
 * weak — so a shelf of stop orders builds under Friday's low, placed by everyone
 * who is long and everyone who sold the failure. Monday morning, price is pushed
 * back up toward Thursday's high. That push does two things at once: it triggers
 * breakout buying above the old high, and it forces early shorts to buy back to
 * cover. Both are buying. If a seller wanted a bid to hit, one has just been
 * manufactured.
 *
 * What follows, if the premise is right, is a fast rejection — price leaves the
 * area quickly enough that the market skips prices on the way down, which is
 * what a fair value gap is: a three-bar window where the first bar's low never
 * met the third bar's high. Nothing traded in between. That gap is the footprint
 * of the repricing, and the model treats it as the place to sell into a bounce.
 *
 * ---
 *
 * WHAT THIS FILE IS NOT
 *
 * It is not a claim that the story above is true. It is the machinery for
 * finding out. Every threshold is a parameter with a default that is stated
 * rather than tuned, the sample is whatever the data supports, and the losing
 * assumptions below are resolved against the trader rather than for them.
 *
 * THE THREE PLACES A BACKTEST LIES, AND WHAT IS DONE ABOUT THEM HERE
 *
 *   1. Same-bar stop and target. When one bar's range covers both, the order
 *      they were hit in is unknowable from OHLC. Resolved as the STOP, always.
 *      Assuming the target is how a losing model is made to look profitable.
 *   2. Look-ahead. Every decision is made from bars at or before the decision
 *      bar. The weekly levels come from days that have already closed; the entry
 *      is only allowed on bars after the gap is complete.
 *   3. Fills at impossible prices. The limit is only filled if a later bar's
 *      HIGH actually reached it, and it fills at the limit price, never better.
 */

/* ------------------------------------------------------------------ *
 * Bars
 * ------------------------------------------------------------------ */

/**
 * One session's daily bar. Dates are New York calendar days.
 *
 * No OPEN, because nothing reads one: the weekly test is Thursday's high against
 * Friday's high, low and close, and ATR is built from high, low and close. It
 * was a fifth of the weight of a ten-year series for a field no line of this
 * file touched. Intraday bars DO carry it — a session chart draws candles.
 */
export type DailyBar = {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
};

/** One intraday bar, stamped with its New York wall-clock start. */
export type IntradayBar = {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
};

/**
 * Day of the week for a calendar date, without a timezone hazard.
 *
 * The string is a New York calendar day already, so it must not be re-zoned.
 * Parsing it at midday UTC keeps it on the same date in every zone the build
 * might run in — parsing `'2024-01-08'` bare gives UTC midnight, which is the
 * 7th in New York and shifts every weekday by one.
 */
export function dayOfWeek(date: string): number {
  return new Date(`${date}T12:00:00Z`).getUTCDay();
}

/* ------------------------------------------------------------------ *
 * Volatility
 * ------------------------------------------------------------------ */

/**
 * Average true range.
 *
 * True range is the largest of: today's range, the gap up from yesterday's
 * close, and the gap down from it —
 *
 *     TR = max(high − low, |high − prevClose|, |low − prevClose|)
 *
 * The two gap terms are the point. A stock that closes at 100 and opens at 95
 * has moved five dollars, and a plain high-minus-low says it moved whatever it
 * did after the open. Ignoring the overnight move understates the volatility of
 * exactly the names this model trades.
 *
 * Wilder's smoothing, which is an exponential average with α = 1/period, not a
 * simple mean of the last n.
 */
export function atr(bars: DailyBar[], period = 14): number[] {
  const out = new Array<number>(bars.length).fill(NaN);
  if (bars.length < 2) return out;

  const tr: number[] = [];
  for (let i = 0; i < bars.length; i++) {
    const b = bars[i];
    if (i === 0) {
      tr.push(b.high - b.low);
      continue;
    }
    const prev = bars[i - 1].close;
    tr.push(Math.max(b.high - b.low, Math.abs(b.high - prev), Math.abs(b.low - prev)));
  }

  // Seed with the simple mean of the first `period` true ranges, then smooth.
  let running = 0;
  for (let i = 0; i < period && i < tr.length; i++) running += tr[i];
  if (tr.length < period) return out;

  let value = running / period;
  out[period - 1] = value;
  for (let i = period; i < tr.length; i++) {
    value = (value * (period - 1) + tr[i]) / period;
    out[i] = value;
  }
  return out;
}

/* ------------------------------------------------------------------ *
 * Parameters
 * ------------------------------------------------------------------ */

export type SweepParams = {
  /**
   * How close to Thursday's high counts as a sweep, in ATRs.
   *
   * The spec says "breaches or comes within a threshold". Measuring that
   * threshold in ATRs rather than percent is what lets one number apply to both
   * a $300 stock and a $900 one: half an ATR is the same amount of *effort* in
   * either, where half a percent is not.
   */
  sweepAtr: number;
  /** Friday must close in the bottom fraction of its own range. */
  fridayCloseBand: number;
  /** Reject setups whose reward-to-risk is below this before entering. */
  minRewardRisk: number;
  /** Give up and exit at the close after this many sessions. */
  maxHoldDays: number;
  /** Pad the stop above the swing high, in ATRs, so it is not sitting on it. */
  stopPadAtr: number;
};

export const DEFAULTS: SweepParams = {
  sweepAtr: 0.25,
  fridayCloseBand: 0.5,
  minRewardRisk: 1.5,
  maxHoldDays: 5,
  stopPadAtr: 0.1,
};

/* ------------------------------------------------------------------ *
 * Results
 * ------------------------------------------------------------------ */

/** Why a Monday produced no trade. Counted, so the funnel can be shown. */
export type RejectReason =
  | 'no-weekly-bars'
  | 'holiday-week'
  | 'thursday-not-higher'
  | 'friday-closed-strong'
  | 'no-sweep'
  | 'no-structure-shift'
  | 'no-gap'
  | 'reward-too-small'
  | 'never-filled';

export type Trade = {
  monday: string;
  entry: number;
  stop: number;
  target: number;
  /** Reward-to-risk as planned, before the outcome is known. */
  plannedRR: number;
  exit: number;
  /** Session the trade closed on. */
  exitDate: string;
  outcome: 'target' | 'stop' | 'timeout';
  /**
   * Result in R — multiples of the amount risked.
   *
   * Everything downstream is in R rather than dollars, because R is the only
   * unit in which a $180 stock and a $900 one are comparable, and the only one
   * that survives a change of position size.
   */
  r: number;
  thursdayHigh: number;
  fridayLow: number;

  /*
    Where it happened, so the chart can draw it rather than describe it.

    A backtest that reports only a number asks to be believed. One that can put
    the gap, the fill and the exit on the candles they occurred on can be checked
    — and the first thing anyone should do with a strategy's results is look at
    the trades it claims to have taken.
  */

  /** The gap sold into: `[bottom, top]`. The limit sits at the top. */
  gap: [number, number];
  /** Session time of the bar that completed the gap. */
  gapAt: string;
  /** Session time of the bar whose high reached the limit. */
  entryAt: string;
  /** Session time of the exit bar, when the trade closed inside the session. */
  exitAt?: string;
};

export type Funnel = Record<RejectReason, number> & { traded: number; mondays: number };

/* ------------------------------------------------------------------ *
 * The model
 * ------------------------------------------------------------------ */

type WeeklyContext = {
  thursday: DailyBar;
  friday: DailyBar;
  atrValue: number;
  fridayIndex: number;
};

/**
 * The two sessions before a Monday, with the pattern's shape verified.
 *
 * Holiday weeks are skipped rather than approximated. If Friday was a holiday,
 * the last two sessions are Wednesday and Thursday, and calling those "Thursday
 * and Friday" would quietly change what is being tested — the setup is about a
 * week ending weak into the weekend, and a Thursday close is not that.
 */
function weeklyContext(
  daily: DailyBar[],
  index: Map<string, number>,
  monday: string,
  atrs: number[],
): WeeklyContext | RejectReason {
  const mondayIndex = index.get(monday);
  const priorIndex =
    mondayIndex === undefined
      ? // Monday itself may be missing from the daily series (a holiday), so
        // fall back to the last session strictly before it.
        lastBefore(daily, monday)
      : mondayIndex - 1;

  if (priorIndex === null || priorIndex < 1) return 'no-weekly-bars';

  const friday = daily[priorIndex];
  const thursday = daily[priorIndex - 1];
  if (!friday || !thursday) return 'no-weekly-bars';

  if (dayOfWeek(friday.date) !== 5 || dayOfWeek(thursday.date) !== 4) return 'holiday-week';

  const atrValue = atrs[priorIndex];
  if (!Number.isFinite(atrValue)) return 'no-weekly-bars';

  return { thursday, friday, atrValue, fridayIndex: priorIndex };
}

function lastBefore(daily: DailyBar[], date: string): number | null {
  for (let i = daily.length - 1; i >= 0; i--) {
    if (daily[i].date < date) return i;
  }
  return null;
}

/**
 * Run one Monday.
 *
 * Returns a trade, or the reason there was not one. The reasons are the useful
 * half of the output: a strategy that fires four times in three years is not a
 * strategy, and only the funnel shows that.
 */
export function runSession(
  monday: string,
  session: IntradayBar[],
  daily: DailyBar[],
  index: Map<string, number>,
  atrs: number[],
  params: SweepParams,
): Trade | RejectReason {
  const context = weeklyContext(daily, index, monday, atrs);
  if (typeof context === 'string') return context;
  const { thursday, friday, atrValue, fridayIndex } = context;

  // 1. Friday failed to take Thursday's high.
  if (thursday.high <= friday.high) return 'thursday-not-higher';

  // 2. …and closed weak, leaving stops under its low.
  const fridayRange = friday.high - friday.low;
  const closePosition = fridayRange > 0 ? (friday.close - friday.low) / fridayRange : 1;
  if (closePosition > params.fridayCloseBand) return 'friday-closed-strong';

  if (session.length < 3) return 'no-sweep';

  /*
    3. The Judas swing: price reaches up to Thursday's high, or close enough to
    it that the stops above are in play. "Close enough" is a band measured in
    ATRs below the level — see `sweepAtr`.
  */
  const band = thursday.high - params.sweepAtr * atrValue;
  let sweepBar = -1;
  for (let i = 0; i < session.length; i++) {
    if (session[i].high >= band) {
      sweepBar = i;
      break;
    }
  }
  if (sweepBar === -1) return 'no-sweep';

  // The high of the trap, and the low it rallied from. Both are read only from
  // bars up to and including the sweep — nothing after it is known yet.
  let swingHigh = -Infinity;
  let swingLow = Infinity;
  for (let i = 0; i <= sweepBar; i++) {
    swingHigh = Math.max(swingHigh, session[i].high);
    swingLow = Math.min(swingLow, session[i].low);
  }

  /*
    4. The structure shift: price takes out the low the rally started from. Until
    that happens the move up is still intact and a short is a guess.
  */
  let shiftBar = -1;
  for (let i = sweepBar + 1; i < session.length; i++) {
    if (session[i].low < swingLow) {
      shiftBar = i;
      break;
    }
    // A new high before the shift means the trap was not a trap.
    if (session[i].high > swingHigh) return 'no-structure-shift';
  }
  if (shiftBar === -1) return 'no-structure-shift';

  /*
    5. The gap. Three consecutive bars where the first bar's LOW is above the
    third bar's HIGH: a band of prices that never traded on the way down. The
    scan starts far enough back that the gap may straddle the shift bar, since
    the displacement that breaks structure is usually the same move that leaves
    the gap.
  */
  let gapTop = NaN;
  let gapBottom = NaN;
  let gapBar = -1;
  for (let i = Math.max(0, sweepBar); i + 2 < session.length; i++) {
    if (i + 2 < shiftBar) continue;
    const first = session[i];
    const third = session[i + 2];
    if (first.low > third.high) {
      gapTop = first.low;
      gapBottom = third.high;
      gapBar = i + 2;
      break;
    }
  }
  if (gapBar === -1) return 'no-gap';

  /*
    6. The order. Sell the top of the gap — the best price inside it for a
    seller — with the stop above the swing high and the target at Friday's low,
    which is where the stops this whole move was aimed at are resting.
  */
  const entry = gapTop;
  const stop = swingHigh + params.stopPadAtr * atrValue;
  const target = friday.low;

  const risk = stop - entry;
  const reward = entry - target;
  if (risk <= 0 || reward <= 0) return 'reward-too-small';

  const plannedRR = reward / risk;
  if (plannedRR < params.minRewardRisk) return 'reward-too-small';

  return resolve(
    {
      monday,
      entry,
      stop,
      target,
      plannedRR,
      thursdayHigh: thursday.high,
      fridayLow: friday.low,
      gap: [gapBottom, gapTop],
      gapAt: session[gapBar].time,
    },
    session,
    gapBar,
    daily,
    fridayIndex,
    params,
  );
}

type Pending = Pick<
  Trade,
  | 'monday'
  | 'entry'
  | 'stop'
  | 'target'
  | 'plannedRR'
  | 'thursdayHigh'
  | 'fridayLow'
  | 'gap'
  | 'gapAt'
>;

/**
 * Fill the limit, then walk forward until the stop or the target is hit.
 *
 * The limit is only filled if a later bar's high actually reaches it — a gap
 * that never gets revisited is a setup that never became a trade, and counting
 * it as one is the most flattering mistake in this whole file.
 */
function resolve(
  plan: Pending,
  session: IntradayBar[],
  gapBar: number,
  daily: DailyBar[],
  fridayIndex: number,
  params: SweepParams,
): Trade | RejectReason {
  const risk = plan.stop - plan.entry;
  let filled = false;
  let entryAt = '';

  const finish = (
    exit: number,
    exitDate: string,
    outcome: Trade['outcome'],
    exitAt?: string,
  ): Trade => ({
    ...plan,
    entryAt,
    exitAt,
    exit,
    exitDate,
    outcome,
    r: (plan.entry - exit) / risk,
  });

  // Monday, at whatever resolution the session was given.
  for (let i = gapBar + 1; i < session.length; i++) {
    const bar = session[i];

    if (!filled) {
      if (bar.high < plan.entry) continue;
      filled = true;
      entryAt = bar.time;
      /*
        Filled on this bar. It may also have hit the stop or the target inside
        the same bar, so the checks below run on it rather than the next one.
      */
    }

    // Stop before target when one bar covers both — see the header.
    if (bar.high >= plan.stop) return finish(plan.stop, plan.monday, 'stop', bar.time);
    if (bar.low <= plan.target) return finish(plan.target, plan.monday, 'target', bar.time);
  }

  if (!filled) return 'never-filled';

  // Still open at Monday's close. Continue on daily bars.
  const mondayIndex = fridayIndex + 1;
  for (let d = mondayIndex + 1; d <= mondayIndex + params.maxHoldDays && d < daily.length; d++) {
    const bar = daily[d];
    if (bar.high >= plan.stop) return finish(plan.stop, bar.date, 'stop');
    if (bar.low <= plan.target) return finish(plan.target, bar.date, 'target');
  }

  // Out of time. Exit at the last close available.
  const lastIndex = Math.min(mondayIndex + params.maxHoldDays, daily.length - 1);
  const last = daily[lastIndex];
  return finish(last.close, last.date, 'timeout');
}

/* ------------------------------------------------------------------ *
 * Running the whole history
 * ------------------------------------------------------------------ */

export type Metrics = {
  trades: number;
  wins: number;
  winRate: number;
  /** Average winning trade, in R. */
  avgWin: number;
  /** Average losing trade, in R. Negative. */
  avgLoss: number;
  /** The number the whole model lives or dies by, in R per trade. */
  expectancy: number;
  totalR: number;
  /** Gross wins ÷ gross losses. Below 1 is a losing system. */
  profitFactor: number;
  /** Deepest peak-to-trough fall of the R curve. Positive. */
  maxDrawdown: number;
  /** Per-trade Sharpe, annualised by how often the model actually trades. */
  sharpe: number;
  /** Mean planned reward-to-risk, before outcomes. */
  avgPlannedRR: number;
};

const mean = (xs: number[]): number =>
  xs.length ? xs.reduce((s, v) => s + v, 0) / xs.length : 0;

function stdev(xs: number[]): number {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  // Sample standard deviation: n − 1, because these trades are a sample of the
  // strategy's behaviour rather than the whole population of it.
  return Math.sqrt(xs.reduce((s, v) => s + (v - m) ** 2, 0) / (xs.length - 1));
}

/** Cumulative R after each trade, starting at zero. */
export function equityCurve(trades: Trade[]): number[] {
  const curve = [0];
  let total = 0;
  for (const t of trades) {
    total += t.r;
    curve.push(total);
  }
  return curve;
}

export function maxDrawdown(curve: number[]): number {
  let peak = -Infinity;
  let worst = 0;
  for (const v of curve) {
    peak = Math.max(peak, v);
    worst = Math.max(worst, peak - v);
  }
  return worst;
}

/**
 * Summary statistics for a sequence of trades.
 *
 * `years` is how much calendar time the sequence spans, and it is required
 * rather than inferred: the Sharpe below is a per-trade figure scaled by trade
 * frequency, so a model that trades ten times a year and one that trades two
 * hundred cannot be compared without it.
 *
 * THAT SHARPE IS NOT A PORTFOLIO SHARPE. It measures the consistency of the
 * trade sequence, not of a capital base — there is no cash drag in it, no
 * position sizing, and no assumption that the strategy is always invested. It
 * answers "how repeatable is this edge", which is the question a strategy is
 * asked, and not "what would owning it have returned", which is a different one.
 */
export function summarise(trades: Trade[], years: number): Metrics {
  const rs = trades.map((t) => t.r);
  const wins = rs.filter((r) => r > 0);
  const losses = rs.filter((r) => r <= 0);

  const grossWin = wins.reduce((s, v) => s + v, 0);
  const grossLoss = Math.abs(losses.reduce((s, v) => s + v, 0));

  const perYear = years > 0 ? trades.length / years : 0;
  const sd = stdev(rs);

  return {
    trades: trades.length,
    wins: wins.length,
    winRate: trades.length ? wins.length / trades.length : 0,
    avgWin: mean(wins),
    avgLoss: mean(losses),
    expectancy: mean(rs),
    totalR: rs.reduce((s, v) => s + v, 0),
    profitFactor: grossLoss > 0 ? grossWin / grossLoss : grossWin > 0 ? Infinity : 0,
    maxDrawdown: maxDrawdown(equityCurve(trades)),
    sharpe: sd > 0 ? (mean(rs) / sd) * Math.sqrt(perYear) : 0,
    avgPlannedRR: mean(trades.map((t) => t.plannedRR)),
  };
}

/* ------------------------------------------------------------------ *
 * Monte Carlo
 * ------------------------------------------------------------------ */

export type RiskResult = {
  /** Median deepest drawdown across runs, as a fraction of starting capital. */
  medianDrawdown: number;
  /** The bad-but-not-impossible case: 95th percentile drawdown. */
  p95Drawdown: number;
  /** Share of runs that ever lost `ruinAt` of the account. */
  riskOfRuin: number;
  /** Median ending balance, as a multiple of the start. */
  medianGrowth: number;
};

/**
 * Reorder the same trades, many times, and see what the sequence could have
 * done to an account.
 *
 * The point is that the ORDER is arbitrary. The edge — the set of R values — is
 * what the model produced; the particular sequence they arrived in is one draw
 * from an enormous number of equally plausible ones, and the drawdown depends
 * entirely on the sequence. A model can have a positive expectancy and still
 * have ruined an account that met its losing streak first.
 *
 * Compounding is on: each trade risks a fixed FRACTION of the balance at the
 * time, which is how position sizing is actually done and why a 50% loss needs
 * a 100% gain to undo.
 *
 * Sampling is with replacement — a bootstrap rather than a shuffle — so the runs
 * are not all permutations of one fixed multiset. A permutation of 60 trades
 * always ends at the same balance, which would make the terminal distribution a
 * single point and say nothing.
 */
export function monteCarlo(
  trades: Trade[],
  { riskFraction = 0.01, runs = 5000, ruinAt = 0.5, seed = 20260824 } = {},
): RiskResult {
  if (trades.length === 0) {
    return { medianDrawdown: 0, p95Drawdown: 0, riskOfRuin: 0, medianGrowth: 1 };
  }

  let s = seed >>> 0 || 1;
  const random = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };

  const rs = trades.map((t) => t.r);
  const drawdowns: number[] = [];
  const finals: number[] = [];
  let ruined = 0;

  for (let run = 0; run < runs; run++) {
    let balance = 1;
    let peak = 1;
    let worst = 0;
    let dead = false;

    for (let i = 0; i < rs.length; i++) {
      const r = rs[Math.floor(random() * rs.length)];
      balance *= 1 + riskFraction * r;
      if (balance <= 0) {
        balance = 0;
        dead = true;
      }
      peak = Math.max(peak, balance);
      worst = Math.max(worst, (peak - balance) / peak);
      if (!dead && balance <= 1 - ruinAt) dead = true;
      if (balance === 0) break;
    }

    if (dead) ruined++;
    drawdowns.push(worst);
    finals.push(balance);
  }

  const quantile = (xs: number[], p: number) => {
    const sorted = [...xs].sort((a, b) => a - b);
    return sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))];
  };

  return {
    medianDrawdown: quantile(drawdowns, 0.5),
    p95Drawdown: quantile(drawdowns, 0.95),
    riskOfRuin: ruined / runs,
    medianGrowth: quantile(finals, 0.5),
  };
}

/* ------------------------------------------------------------------ *
 * The backtest
 * ------------------------------------------------------------------ */

export type BacktestResult = {
  trades: Trade[];
  funnel: Funnel;
  metrics: Metrics;
  /** Cumulative R after each trade, starting at zero. */
  equity: number[];
  /** Calendar years the Monday sample spans. */
  years: number;
};

const EMPTY_FUNNEL = (): Funnel => ({
  mondays: 0,
  traded: 0,
  'no-weekly-bars': 0,
  'holiday-week': 0,
  'thursday-not-higher': 0,
  'friday-closed-strong': 0,
  'no-sweep': 0,
  'no-structure-shift': 0,
  'no-gap': 0,
  'reward-too-small': 0,
  'never-filled': 0,
});

/**
 * Run every Monday in the sample.
 *
 * The funnel is returned alongside the trades because it is half the result. A
 * strategy is not only its win rate: how many opportunities it looked at, and
 * which condition threw most of them away, is what tells you whether the edge is
 * real or whether the filters have been tightened until only the winners are
 * left. That second failure has no signature in the equity curve at all.
 */
export function backtest(
  daily: DailyBar[],
  sessions: Record<string, IntradayBar[]>,
  overrides: Partial<SweepParams> = {},
): BacktestResult {
  const params = { ...DEFAULTS, ...overrides };
  const index = new Map(daily.map((bar, i) => [bar.date, i]));
  const atrs = atr(daily);

  const funnel = EMPTY_FUNNEL();
  const trades: Trade[] = [];

  /*
    MONDAYS ONLY, filtered here rather than assumed.

    This used to take every key in `sessions`, because the archive stored nothing
    else. It stores every session now — the chart needs continuity, and a
    five-day candlestick chart built from Mondays would have four holes in it —
    and this loop went on trusting the old shape. Every Tuesday was run as if it
    were a Monday, found Monday and Friday behind it instead of Friday and
    Thursday, and was thrown out as a short week: 343 of 420 sessions, an 82%
    "holiday" rate against a real one nearer 8%.

    It did not throw and it did not show up in the trade count, which stayed
    zero either way. It showed up in the funnel, which is the argument for
    printing the funnel.
  */
  const mondays = Object.keys(sessions)
    .filter((date) => dayOfWeek(date) === 1)
    .sort();

  for (const monday of mondays) {
    funnel.mondays++;
    const outcome = runSession(monday, sessions[monday], daily, index, atrs, params);
    if (typeof outcome === 'string') {
      funnel[outcome]++;
      continue;
    }
    funnel.traded++;
    trades.push(outcome);
  }

  const years =
    mondays.length > 1
      ? (Date.parse(`${mondays[mondays.length - 1]}T12:00:00Z`) -
          Date.parse(`${mondays[0]}T12:00:00Z`)) /
        (365.25 * 24 * 3600 * 1000)
      : 0;

  return {
    trades,
    funnel,
    metrics: summarise(trades, years),
    equity: equityCurve(trades),
    years,
  };
}

/* ------------------------------------------------------------------ *
 * The weekly setup, on its own
 * ------------------------------------------------------------------ */

export type SetupScan = {
  mondays: number;
  holidayWeeks: number;
  thursdayNotHigher: number;
  fridayClosedStrong: number;
  /** Mondays that passed the weekly filter. */
  qualified: number;
  /** …and then traded up into the sweep band. */
  reached: number;
  /**
   * How near Monday came to Thursday's high, in ATRs, one per qualified Monday.
   * Zero means it touched exactly; negative means it fell short.
   */
  reach: number[];
  years: number;
};

/**
 * Scan the weekly setup across daily bars alone.
 *
 * The first three conditions — Thursday higher than Friday, Friday closing weak,
 * Monday reaching back up — are entirely daily-bar questions. Nothing about them
 * needs an intraday series, which matters a great deal here: the intraday
 * archive is sixty days deep and growing, while daily bars go back a decade.
 *
 * So the rarity of the SETUP can be measured over ten years and thousands of
 * Mondays today, while the profitability of the TRADE waits for the archive.
 * Reporting the two at their own sample sizes, rather than pretending both rest
 * on the smaller one, is the difference between a result and a guess.
 */
export function scanSetups(daily: DailyBar[], overrides: Partial<SweepParams> = {}): SetupScan {
  const params = { ...DEFAULTS, ...overrides };
  const atrs = atr(daily);

  const scan: SetupScan = {
    mondays: 0,
    holidayWeeks: 0,
    thursdayNotHigher: 0,
    fridayClosedStrong: 0,
    qualified: 0,
    reached: 0,
    reach: [],
    years: 0,
  };

  let first = '';
  let last = '';

  for (let i = 2; i < daily.length; i++) {
    const monday = daily[i];
    if (dayOfWeek(monday.date) !== 1) continue;

    scan.mondays++;
    first ||= monday.date;
    last = monday.date;

    const friday = daily[i - 1];
    const thursday = daily[i - 2];

    // A short week is skipped rather than approximated: the setup is about a
    // week ending weak into the weekend, and a Wednesday close is not that.
    if (dayOfWeek(friday.date) !== 5 || dayOfWeek(thursday.date) !== 4) {
      scan.holidayWeeks++;
      continue;
    }

    if (thursday.high <= friday.high) {
      scan.thursdayNotHigher++;
      continue;
    }

    const range = friday.high - friday.low;
    const closePosition = range > 0 ? (friday.close - friday.low) / range : 1;
    if (closePosition > params.fridayCloseBand) {
      scan.fridayClosedStrong++;
      continue;
    }

    const atrValue = atrs[i - 1];
    if (!Number.isFinite(atrValue) || atrValue <= 0) continue;

    scan.qualified++;
    const gap = (monday.high - thursday.high) / atrValue;
    scan.reach.push(gap);
    if (gap >= -params.sweepAtr) scan.reached++;
  }

  scan.years =
    first && last
      ? (Date.parse(`${last}T12:00:00Z`) - Date.parse(`${first}T12:00:00Z`)) /
        (365.25 * 24 * 3600 * 1000)
      : 0;

  return scan;
}

/* ------------------------------------------------------------------ *
 * The account
 * ------------------------------------------------------------------ */

export type Fill = {
  trade: Trade;
  /** Whole shares, sized so the stop costs `risk` of the balance. */
  shares: number;
  /** What the stop would have cost, in currency. */
  risked: number;
  /** Realised profit or loss, in currency. */
  pnl: number;
  /** Balance after this trade closed. */
  balance: number;
};

export type Account = {
  starting: number;
  ending: number;
  /** Total return on the starting balance. */
  returnPct: number;
  /** Deepest peak-to-trough fall, as a fraction of the peak. */
  maxDrawdownPct: number;
  /** Balance after each trade, starting with the opening balance. */
  curve: number[];
  fills: Fill[];
  /** Trades skipped because one share already risked more than the budget. */
  skipped: number;
};

/**
 * Run the trades through an account.
 *
 * R-multiples say whether a strategy has an edge; they do not say what happened
 * to the money, and "what happened to the money" is the only question most
 * people are actually asking. This turns one into the other.
 *
 * FIXED FRACTIONAL SIZING. Each trade risks the same PERCENTAGE of the balance
 * at the time, not the same dollar amount — which is how position sizing is
 * really done, and why the curve compounds rather than adding. It also means a
 * losing run shrinks the next bet automatically, which is most of why fixed
 * fractional survives sequences that fixed-dollar does not.
 *
 * WHOLE SHARES. `Math.floor`, so the position is one a broker could actually
 * fill. Fractional shares would quietly let a $500 account take a $900 stock at
 * exactly its risk budget and make the curve smoother than any real one.
 *
 * A trade whose single share already risks more than the budget is SKIPPED and
 * counted, rather than taken at a size the rules do not allow. That count is
 * reported: a strategy that only fits a large account is a fact about the
 * strategy, and rounding it away would hide it.
 */
export function simulateAccount(
  trades: Trade[],
  { starting = 25_000, risk = 0.01 }: { starting?: number; risk?: number } = {},
): Account {
  let balance = starting;
  let peak = starting;
  let worst = 0;
  let skipped = 0;

  const curve = [starting];
  const fills: Fill[] = [];

  for (const trade of trades) {
    const perShare = trade.stop - trade.entry;
    if (perShare <= 0) continue;

    const budget = balance * risk;
    const shares = Math.floor(budget / perShare);
    if (shares < 1) {
      skipped++;
      continue;
    }

    // Short: the profit is the distance the price fell from the fill.
    const pnl = (trade.entry - trade.exit) * shares;
    balance += pnl;

    peak = Math.max(peak, balance);
    worst = Math.max(worst, (peak - balance) / peak);

    curve.push(balance);
    fills.push({ trade, shares, risked: perShare * shares, pnl, balance });
  }

  return {
    starting,
    ending: balance,
    returnPct: starting > 0 ? balance / starting - 1 : 0,
    maxDrawdownPct: worst,
    curve,
    fills,
    skipped,
  };
}
