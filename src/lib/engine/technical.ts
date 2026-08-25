/**
 * Technical features: what the price and volume tape says about a name.
 *
 * Every function here returns an array aligned to the input bars, where entry
 * `i` is computed from bars `0..i` and nothing later. That is the whole contract
 * of this file, and it is the difference between a backtest and a fantasy.
 *
 * ---
 * WHY NaN AND NOT ZERO
 *
 * A 200-day average does not exist on day 12. Filling that with 0 does not mean
 * "unknown", it means "the average is zero", and a tree model will happily split
 * on it and learn that early-life stocks are special. NaN propagates honestly:
 * the trainer drops those rows, and the gradient-boosted trees route missing
 * values down a learned default branch rather than pretending.
 *
 * ---
 * WHY SO MANY HORIZONS
 *
 * One-month and twelve-month momentum are not the same signal with a different
 * dial — the first is a reversal and the second is a continuation, and they
 * routinely point opposite ways. Handing the model both, plus the horizons in
 * between, lets it learn where the sign flips instead of being told.
 */

export type Bar = {
  /** ISO date, New York calendar. */
  d: string;
  o: number | null;
  h: number | null;
  l: number | null;
  /** Split and dividend adjusted close. */
  c: number;
  v: number;
};

const nan = (n: number) => new Array<number>(n).fill(NaN);

/** Simple return over `span` bars, ending at each index. */
export function trailingReturn(bars: Bar[], span: number): number[] {
  const out = nan(bars.length);
  for (let i = span; i < bars.length; i++) {
    const a = bars[i - span].c;
    if (a > 0) out[i] = bars[i].c / a - 1;
  }
  return out;
}

/**
 * Twelve-month momentum skipping the most recent month.
 *
 * The skip is not a detail. Twelve-month momentum continues and one-month
 * momentum reverses, so measuring straight through to today mixes a signal with
 * its own opposite and blunts both. Jegadeesh and Titman's original construction
 * skips the last month for exactly this reason.
 */
export function momentum12_1(bars: Bar[]): number[] {
  const out = nan(bars.length);
  for (let i = 252; i < bars.length; i++) {
    const a = bars[i - 252].c;
    const b = bars[i - 21].c;
    if (a > 0 && b > 0) out[i] = b / a - 1;
  }
  return out;
}

/** Wilder's RSI. Overbought/oversold, and a decent short-horizon reversal cue. */
export function rsi(bars: Bar[], period = 14): number[] {
  const out = nan(bars.length);
  if (bars.length <= period) return out;

  let gain = 0;
  let loss = 0;
  for (let i = 1; i <= period; i++) {
    const change = bars[i].c - bars[i - 1].c;
    if (change >= 0) gain += change;
    else loss -= change;
  }
  gain /= period;
  loss /= period;
  out[period] = loss === 0 ? 100 : 100 - 100 / (1 + gain / loss);

  for (let i = period + 1; i < bars.length; i++) {
    const change = bars[i].c - bars[i - 1].c;
    // Wilder smoothing, which is an EMA with alpha = 1/period.
    gain = (gain * (period - 1) + Math.max(0, change)) / period;
    loss = (loss * (period - 1) + Math.max(0, -change)) / period;
    out[i] = loss === 0 ? 100 : 100 - 100 / (1 + gain / loss);
  }
  return out;
}

function ema(values: number[], period: number): number[] {
  const out = nan(values.length);
  const k = 2 / (period + 1);
  let acc = 0;
  for (let i = 0; i < values.length; i++) {
    const v = values[i];
    if (!Number.isFinite(v)) continue;
    if (!Number.isFinite(out[i - 1])) {
      // Seed on the first usable value rather than on a partial average, so the
      // series does not carry a startup bias that decays for fifty bars.
      acc = v;
    } else {
      acc = v * k + acc * (1 - k);
    }
    out[i] = acc;
  }
  return out;
}

/** MACD line, signal and histogram, each scaled by price so names compare. */
export function macd(bars: Bar[], fast = 12, slow = 26, signal = 9) {
  const close = bars.map((b) => b.c);
  const f = ema(close, fast);
  const s = ema(close, slow);
  const line = close.map((_, i) => f[i] - s[i]);
  const sig = ema(line, signal);
  return {
    line: line.map((v, i) => (bars[i].c > 0 ? v / bars[i].c : NaN)),
    signal: sig.map((v, i) => (bars[i].c > 0 ? v / bars[i].c : NaN)),
    histogram: line.map((v, i) => (bars[i].c > 0 ? (v - sig[i]) / bars[i].c : NaN)),
  };
}

/**
 * Average true range, as a fraction of price.
 *
 * True range rather than high-minus-low because it counts the overnight gap. A
 * stock that closed at 100 and opened at 90 had a ten-point day before it
 * traded, and a range that ignores that understates exactly the names whose risk
 * arrives outside market hours — which is most of the ones that matter.
 */
export function atr(bars: Bar[], period = 14): number[] {
  const out = nan(bars.length);
  const tr: number[] = nan(bars.length);
  for (let i = 1; i < bars.length; i++) {
    const h = bars[i].h;
    const l = bars[i].l;
    const pc = bars[i - 1].c;
    if (h == null || l == null) continue;
    tr[i] = Math.max(h - l, Math.abs(h - pc), Math.abs(l - pc));
  }
  let acc = 0;
  let seeded = false;
  let count = 0;
  for (let i = 1; i < bars.length; i++) {
    if (!Number.isFinite(tr[i])) continue;
    if (!seeded) {
      acc += tr[i];
      if (++count === period) { acc /= period; seeded = true; out[i] = acc / bars[i].c; }
      continue;
    }
    acc = (acc * (period - 1) + tr[i]) / period;
    if (bars[i].c > 0) out[i] = acc / bars[i].c;
  }
  return out;
}

/**
 * Annualised realised volatility of daily log returns over a window.
 *
 * Rolling rather than re-summed. The obvious implementation walks the whole
 * window at every index, which is O(n·w) — with a 252-day window across 503
 * names and 4,207 days that is over five hundred million operations for ONE
 * feature, and there are six of this shape. Keeping running sums makes each step
 * O(1) and the panel build seconds rather than minutes, which matters because
 * this runs nightly.
 */
export function realisedVol(bars: Bar[], window: number): number[] {
  const out = nan(bars.length);
  const r = nan(bars.length);
  for (let i = 1; i < bars.length; i++) {
    const a = bars[i - 1].c;
    if (a > 0 && bars[i].c > 0) r[i] = Math.log(bars[i].c / a);
  }

  let sum = 0;
  let sumsq = 0;
  let n = 0;
  for (let i = 0; i < bars.length; i++) {
    if (Number.isFinite(r[i])) { sum += r[i]; sumsq += r[i] * r[i]; n++; }
    const drop = i - window;
    if (drop >= 0 && Number.isFinite(r[drop])) { sum -= r[drop]; sumsq -= r[drop] * r[drop]; n--; }
    if (i < window || n < window * 0.8) continue;
    const variance = (sumsq - (sum * sum) / n) / (n - 1);
    if (variance > 0) out[i] = Math.sqrt(variance) * Math.sqrt(252);
  }
  return out;
}

/**
 * Downside deviation: the same dispersion measure but only over losses.
 *
 * Volatility punishes a stock for going up quickly. Two names with identical
 * volatility, one of which achieved it by rising in jumps and the other by
 * falling in them, are not the same risk, and only this tells them apart.
 */
export function downsideDeviation(bars: Bar[], window: number): number[] {
  const out = nan(bars.length);
  const r = nan(bars.length);
  for (let i = 1; i < bars.length; i++) {
    const a = bars[i - 1].c;
    if (a > 0 && bars[i].c > 0) r[i] = Math.log(bars[i].c / a);
  }
  let ss = 0;
  let n = 0;
  for (let i = 0; i < bars.length; i++) {
    if (Number.isFinite(r[i])) { n++; if (r[i] < 0) ss += r[i] * r[i]; }
    const drop = i - window;
    if (drop >= 0 && Number.isFinite(r[drop])) { n--; if (r[drop] < 0) ss -= r[drop] * r[drop]; }
    if (i < window || n < window * 0.8) continue;
    out[i] = Math.sqrt(ss / n) * Math.sqrt(252);
  }
  return out;
}

/** Distance from a simple moving average, as a fraction of price. */
export function smaDistance(bars: Bar[], window: number): number[] {
  const out = nan(bars.length);
  let sum = 0;
  for (let i = 0; i < bars.length; i++) {
    sum += bars[i].c;
    if (i >= window) sum -= bars[i - window].c;
    if (i >= window - 1) {
      const avg = sum / window;
      if (avg > 0) out[i] = bars[i].c / avg - 1;
    }
  }
  return out;
}

/**
 * Distance below the running 52-week high.
 *
 * A separate signal from momentum and a well-documented one: the high acts as an
 * anchor, and names pressing against it behave differently from names that have
 * risen the same amount while still far beneath one.
 */
export function highWaterDistance(bars: Bar[], window = 252): number[] {
  const out = nan(bars.length);
  /*
    Monotonic deque: indices whose closes are strictly decreasing, so the front
    is always the window's maximum. Each index is pushed and popped at most once,
    which makes the whole pass O(n) instead of O(n·w).
  */
  const deque: number[] = [];
  for (let i = 0; i < bars.length; i++) {
    while (deque.length && bars[deque[deque.length - 1]].c <= bars[i].c) deque.pop();
    deque.push(i);
    if (deque[0] <= i - window) deque.shift();
    if (i < window - 1) continue;
    const hi = bars[deque[0]].c;
    if (hi > 0) out[i] = bars[i].c / hi - 1;
  }
  return out;
}

/** Deepest peak-to-trough fall inside a trailing window. */
export function trailingDrawdown(bars: Bar[], window = 252): number[] {
  const out = nan(bars.length);
  for (let i = window - 1; i < bars.length; i++) {
    let peak = -Infinity;
    let worst = 0;
    for (let k = i - window + 1; k <= i; k++) {
      peak = Math.max(peak, bars[k].c);
      if (peak > 0) worst = Math.max(worst, (peak - bars[k].c) / peak);
    }
    out[i] = worst;
  }
  return out;
}

/** Today's volume against its own trailing average — an attention spike. */
export function relativeVolume(bars: Bar[], window = 21): number[] {
  const out = nan(bars.length);
  let sum = 0;
  for (let i = 0; i < bars.length; i++) {
    sum += bars[i].v;
    if (i >= window) sum -= bars[i - window].v;
    if (i >= window - 1) {
      const avg = sum / window;
      if (avg > 0) out[i] = bars[i].v / avg - 1;
    }
  }
  return out;
}

/**
 * Amihud illiquidity: how far the price moves per dollar traded, logged.
 *
 * The log is not cosmetic. Raw Amihud on large caps lands around 1e-12, and
 * rounding that for storage turned every stock in the universe into the same
 * number — the feature was live, uniform, and therefore worthless, which is not
 * a failure that announces itself.
 */
export function illiquidity(bars: Bar[], window = 21): number[] {
  const out = nan(bars.length);
  const daily = nan(bars.length);
  for (let i = 1; i < bars.length; i++) {
    const a = bars[i - 1].c;
    const dollar = bars[i].c * bars[i].v;
    if (a > 0 && dollar > 0) daily[i] = Math.abs(bars[i].c / a - 1) / dollar;
  }
  let sum = 0;
  let n = 0;
  for (let i = 0; i < bars.length; i++) {
    if (Number.isFinite(daily[i])) { sum += daily[i]; n++; }
    const drop = i - window;
    if (drop >= 0 && Number.isFinite(daily[drop])) { sum -= daily[drop]; n--; }
    if (i < window || n < window * 0.8) continue;
    const mean = sum / n;
    if (mean > 0) out[i] = Math.log(mean);
  }
  return out;
}

/**
 * Rolling beta and idiosyncratic volatility against the market.
 *
 * Both come out of one regression so the residual is guaranteed to belong to the
 * beta beside it. `market` must already be aligned to `bars` — same length, same
 * dates — which the panel builder is responsible for.
 */
export function marketModel(bars: Bar[], market: number[], window = 252) {
  const beta = nan(bars.length);
  const idio = nan(bars.length);

  const r = nan(bars.length);
  for (let i = 1; i < bars.length; i++) {
    const a = bars[i - 1].c;
    if (a > 0 && bars[i].c > 0) r[i] = Math.log(bars[i].c / a);
  }

  /*
    One rolling regression rather than three passes over the window.

    Five running sums are enough to recover both the slope and the residual
    variance exactly:

      b   = (Sxy - Sx·Sy/n) / (Sxx - Sx²/n)
      a   = Sy/n - b·Sx/n
      RSS = Syy - a·Sy - b·Sxy

    That last identity is the one worth stating, because it is what removes the
    third pass: for an OLS fit the residual sum of squares falls out of the same
    accumulators the coefficients came from, with no need to revisit the data.
  */
  let n = 0;
  let sx = 0; let sy = 0; let sxx = 0; let sxy = 0; let syy = 0;

  const add = (k: number, sign: number) => {
    const y = r[k];
    const x = market[k];
    if (!Number.isFinite(y) || !Number.isFinite(x)) return;
    n += sign;
    sx += sign * x; sy += sign * y;
    sxx += sign * x * x; sxy += sign * x * y; syy += sign * y * y;
  };

  for (let i = 0; i < bars.length; i++) {
    add(i, 1);
    if (i - window >= 0) add(i - window, -1);
    if (i < window || n < window * 0.8) continue;

    const varx = sxx - (sx * sx) / n;
    if (!(varx > 0)) continue;
    const b = (sxy - (sx * sy) / n) / varx;
    beta[i] = b;

    const a = sy / n - (b * sx) / n;
    const rss = syy - a * sy - b * sxy;
    if (rss > 0 && n > 2) idio[i] = Math.sqrt(rss / (n - 2)) * Math.sqrt(252);
  }
  return { beta, idio };
}

/** Daily log returns of a series, for use as the market leg. */
export function logReturns(bars: Bar[]): number[] {
  const out = nan(bars.length);
  for (let i = 1; i < bars.length; i++) {
    const a = bars[i - 1].c;
    if (a > 0 && bars[i].c > 0) out[i] = Math.log(bars[i].c / a);
  }
  return out;
}

/** The names of every technical column, in the order `technicalFeatures` emits. */
export const TECHNICAL_COLUMNS = [
  'ret_5', 'ret_21', 'ret_63', 'ret_126', 'mom_12_1',
  'rsi_14', 'macd_line', 'macd_hist',
  'atr_14', 'vol_21', 'vol_63', 'downside_63',
  'sma_50_dist', 'sma_200_dist', 'high_52w_dist', 'drawdown_252',
  'rel_volume', 'illiquidity', 'beta_252', 'idio_252',
] as const;

/**
 * Every technical column for one name, as an array of rows aligned to `bars`.
 *
 * `market` is the benchmark's daily log returns on the same calendar.
 */
export function technicalFeatures(bars: Bar[], market: number[]): number[][] {
  const m = macd(bars);
  const { beta, idio } = marketModel(bars, market);

  const columns = [
    trailingReturn(bars, 5),
    trailingReturn(bars, 21),
    trailingReturn(bars, 63),
    trailingReturn(bars, 126),
    momentum12_1(bars),
    rsi(bars, 14),
    m.line,
    m.histogram,
    atr(bars, 14),
    realisedVol(bars, 21),
    realisedVol(bars, 63),
    downsideDeviation(bars, 63),
    smaDistance(bars, 50),
    smaDistance(bars, 200),
    highWaterDistance(bars, 252),
    trailingDrawdown(bars, 252),
    relativeVolume(bars, 21),
    illiquidity(bars, 21),
    beta,
    idio,
  ];

  if (columns.length !== TECHNICAL_COLUMNS.length) {
    throw new Error(
      `technical: ${columns.length} columns but ${TECHNICAL_COLUMNS.length} names`,
    );
  }

  return bars.map((_, i) => columns.map((col) => col[i]));
}
