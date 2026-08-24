'use client';

/**
 * The liquidity-sweep desk.
 *
 * A strategy with a story attached — institutions push price up into last
 * Thursday's high on a Monday morning to find the buyers they need, then sell
 * into it — and this is the machinery for finding out whether the story leaves
 * a mark in the data. Pick a name, move the thresholds, watch what survives.
 *
 * ---
 *
 * TWO SAMPLE SIZES, REPORTED SEPARATELY, AND THAT IS THE HONEST PART
 *
 * The weekly SETUP is a daily-bar question: did Thursday out-top Friday, did
 * Friday close weak, did Monday come back up. Ten years of daily bars answer it
 * over 3,283 Mondays.
 *
 * The TRADE is not. The structure shift and the fair value gap need intraday
 * bars, and Yahoo gives away a rolling sixty days of those — measured, a gap
 * appears in 92.9% of fifteen-minute sessions and 32.1% of hourly ones, so
 * coarser bars do not approximate the answer, they erase it. The archive grows
 * by seven sessions a week and cannot be hurried.
 *
 * So the two halves are shown at their own sample sizes, each labelled with what
 * it rests on. Quoting the ten-year figure next to a trade count drawn from
 * sixty days would be the single most flattering thing this page could do.
 */

import { useDeferredValue, useMemo, useState } from 'react';
import {
  DEFAULTS,
  backtest,
  monteCarlo,
  scanSetups,
  type SweepParams,
} from '@/lib/sweep';
import { sweepMeta, sweepTicker } from '@/content/sweep';
import { Reveal } from '@/components/motion/Reveal';

const W = 720;
const H = 260;
const PAD = { top: 18, right: 18, bottom: 34, left: 46 };

const pct = (v: number, digits = 1) =>
  Number.isFinite(v) ? `${(v * 100).toFixed(digits)}%` : '—';
const num = (v: number, digits = 2) => (Number.isFinite(v) ? v.toFixed(digits) : '—');

/** The funnel, in the order a Monday meets the conditions. */
const STAGES = [
  ['holiday-week', 'Short week'],
  ['thursday-not-higher', 'Friday beat Thursday'],
  ['friday-closed-strong', 'Friday closed strong'],
  ['no-sweep', 'Never reached the high'],
  ['no-structure-shift', 'Structure held'],
  ['no-gap', 'No gap left behind'],
  ['reward-too-small', 'Reward too small'],
  ['never-filled', 'Limit never filled'],
] as const;

export function SweepInstrument() {
  const [symbol, setSymbol] = useState(sweepMeta.symbols[0].symbol);
  const [sweepAtr, setSweepAtr] = useState(DEFAULTS.sweepAtr);
  const [fridayCloseBand, setFridayCloseBand] = useState(DEFAULTS.fridayCloseBand);
  const [minRewardRisk, setMinRewardRisk] = useState(DEFAULTS.minRewardRisk);

  /*
    Deferred as three primitives rather than one object, for the reason the risk
    desk gives: `useDeferredValue` on a fresh object is a new reference every
    render and defers nothing at all.
  */
  const dSweep = useDeferredValue(sweepAtr);
  const dClose = useDeferredValue(fridayCloseBand);
  const dReward = useDeferredValue(minRewardRisk);

  const ticker = useMemo(() => sweepTicker(symbol), [symbol]);

  const params: Partial<SweepParams> = useMemo(
    () => ({ sweepAtr: dSweep, fridayCloseBand: dClose, minRewardRisk: dReward }),
    [dSweep, dClose, dReward],
  );

  const scan = useMemo(
    () => (ticker ? scanSetups(ticker.daily, params) : null),
    [ticker, params],
  );

  const run = useMemo(
    () => (ticker ? backtest(ticker.daily, ticker.sessions, params) : null),
    [ticker, params],
  );

  const risk = useMemo(
    () => (run && run.trades.length ? monteCarlo(run.trades, { riskFraction: 0.01 }) : null),
    [run],
  );

  /*
    The reach histogram: how near Monday came to Thursday's high, in ATRs, for
    every Monday that passed the weekly filter over ten years.

    ATRs rather than dollars or percent, because that is the only unit in which
    a $180 name and a $900 one can share an axis — half an ATR is the same amount
    of effort in both, half a percent is not.
  */
  const reach = useMemo(() => {
    if (!scan || scan.reach.length === 0) return null;

    /*
      Wide enough that nothing is folded into an end bar.

      The axis was −3 to 1.5, which clamped 1.7% of the sample into the leftmost
      bin and 0.8% into the rightmost — small, but a clamped bin is not a tall
      bin, it is a lie about the shape of the tail. Measured across all seven
      names the reach runs −4.36 to +2.69, so this covers it with room and every
      bar is now the count it says it is.

      FIXED, not fitted to the selected ticker. The axis has to mean the same
      thing when the picker changes, or comparing two names is comparing two
      pictures drawn to different scales.
    */
    const lo = -5;
    const hi = 3;
    const bins = 32;
    const counts = new Array<number>(bins).fill(0);
    for (const value of scan.reach) {
      const clamped = Math.min(hi, Math.max(lo, value));
      const i = Math.min(bins - 1, Math.floor(((clamped - lo) / (hi - lo)) * bins));
      counts[i]++;
    }

    const peak = Math.max(...counts, 1);
    const w = W - PAD.left - PAD.right;
    const h = H - PAD.top - PAD.bottom;
    const x = (v: number) => PAD.left + ((v - lo) / (hi - lo)) * w;

    return {
      lo,
      hi,
      x,
      bars: counts.map((count, i) => {
        const left = lo + (i / bins) * (hi - lo);
        const right = lo + ((i + 1) / bins) * (hi - lo);
        return {
          key: i,
          x: x(left),
          width: Math.max(1, x(right) - x(left) - 1),
          height: (count / peak) * h,
          y: PAD.top + h - (count / peak) * h,
          // Inside the band is a Monday the model calls a sweep.
          inBand: left >= -dSweep,
        };
      }),
    };
  }, [scan, dSweep]);

  if (!ticker || !scan || !run) return null;

  const funnel = run.funnel;
  const metrics = run.metrics;

  return (
    <div className="instrument sweep">
      <Reveal className="instrument__head">
        <div>
          <span className="mono-label instrument__tag">
            {sweepMeta.symbols.length} names · {Math.round(scan.years)} years daily ·{' '}
            {sweepMeta.sessions} intraday sessions
          </span>
          <h3 className="instrument__title">
            Does the Monday trap leave a mark?
          </h3>
          <p className="instrument__sub">
            Thursday tops out. Friday fails to beat it and closes weak, leaving stops
            under the low. Monday morning price is walked back up into Thursday&rsquo;s
            high — and if the story is right, sold into. Move the thresholds and see
            what survives.
          </p>
        </div>
      </Reveal>

      <div className="sweep__picker" role="group" aria-label="Ticker">
        {sweepMeta.symbols.map((entry) => (
          <button
            key={entry.symbol}
            type="button"
            className={`sweep__ticker${entry.symbol === symbol ? ' is-active' : ''}`}
            aria-pressed={entry.symbol === symbol}
            onClick={() => setSymbol(entry.symbol)}
          >
            <span className="sweep__symbol">{entry.symbol}</span>
            <span className="sweep__name">{entry.name}</span>
          </button>
        ))}
      </div>

      <div className="instrument__controls">
        <Control
          label="Counts as a sweep"
          value={`within ${num(sweepAtr)} ATR of Thursday's high`}
          min={0}
          max={2}
          step={0.05}
          current={sweepAtr}
          onChange={setSweepAtr}
          hint="Zero means it must actually touch the high."
        />
        <Control
          label="Friday must close"
          value={`in the bottom ${pct(fridayCloseBand, 0)} of its range`}
          min={0.1}
          max={1}
          step={0.05}
          current={fridayCloseBand}
          onChange={setFridayCloseBand}
          hint="Weak closes are what leave stops under the low."
        />
        <Control
          label="Least reward accepted"
          value={`${num(minRewardRisk)} : 1`}
          min={0.5}
          max={5}
          step={0.25}
          current={minRewardRisk}
          onChange={setMinRewardRisk}
          hint="Skip setups whose target is too near the stop."
        />
      </div>

      <figure className="instrument__figure">
        <figcaption className="mono-label">
          How near Monday got to Thursday&rsquo;s high — {scan.qualified} qualifying
          Mondays, {Math.round(scan.years)} years
        </figcaption>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="instrument__svg"
          role="img"
          aria-label={`Distribution of how close Monday came to Thursday's high, in ATRs. Median ${num(median(scan.reach))}.`}
        >
          {reach?.bars.map((bar) => (
            <rect
              key={bar.key}
              x={bar.x}
              y={bar.y}
              width={bar.width}
              height={bar.height}
              className={bar.inBand ? 'instrument__bar instrument__bar--tail' : 'instrument__bar'}
            />
          ))}

          {/* Thursday's high itself. Everything right of it is a real breach. */}
          {reach ? (
            <>
              <line
                x1={reach.x(0)}
                y1={PAD.top - 6}
                x2={reach.x(0)}
                y2={H - PAD.bottom}
                className="instrument__marker"
              />
              <text
                x={reach.x(0)}
                y={PAD.top - 10}
                className="instrument__axis instrument__axis--accent"
                textAnchor="middle"
              >
                Thursday&rsquo;s high
              </text>
              <line
                x1={PAD.left}
                y1={H - PAD.bottom}
                x2={W - PAD.right}
                y2={H - PAD.bottom}
                className="instrument__baseline"
              />
              {[-4, -3, -2, -1, 0, 1, 2].map((tick) => (
                <text
                  key={tick}
                  x={reach.x(tick)}
                  y={H - 10}
                  className="instrument__axis"
                  textAnchor="middle"
                >
                  {tick} ATR
                </text>
              ))}
            </>
          ) : null}
        </svg>
      </figure>

      <p className="instrument__plain">
        The median Monday stops <strong>{num(Math.abs(median(scan.reach)))} ATR short</strong>{' '}
        of Thursday&rsquo;s high, and only{' '}
        <strong>{pct(scan.reached / Math.max(1, scan.qualified))}</strong> of qualifying
        Mondays reach the band above. The trap the strategy is built on is real, and it
        is rare — which is the first thing a backtest of it has to survive.
      </p>

      <figure className="instrument__figure">
        <figcaption className="mono-label">
          Where {funnel.mondays} intraday Mondays went — {sweepMeta.interval} bars
        </figcaption>
        <ul className="sweep__funnel">
          {STAGES.map(([key, label]) => {
            const value = funnel[key];
            return (
              <li key={key} className="sweep__stage">
                <span className="sweep__stage-label">{label}</span>
                <span className="sweep__stage-bar" aria-hidden="true">
                  <i style={{ width: `${(value / Math.max(1, funnel.mondays)) * 100}%` }} />
                </span>
                <span className="sweep__stage-count">{value}</span>
              </li>
            );
          })}
          <li className="sweep__stage sweep__stage--out">
            <span className="sweep__stage-label">Traded</span>
            <span className="sweep__stage-bar" aria-hidden="true">
              <i style={{ width: `${(funnel.traded / Math.max(1, funnel.mondays)) * 100}%` }} />
            </span>
            <span className="sweep__stage-count">{funnel.traded}</span>
          </li>
        </ul>
      </figure>

      <dl className="instrument__readout">
        <Readout
          label="Setup rate"
          value={pct(scan.qualified / Math.max(1, scan.mondays))}
          note={`${scan.qualified} of ${scan.mondays} Mondays, ${Math.round(scan.years)}y daily`}
        />
        <Readout
          label="Reaches the high"
          value={pct(scan.reached / Math.max(1, scan.qualified))}
          note={`${scan.reached} of ${scan.qualified} qualifying`}
        />
        <Readout
          label="Trades found"
          value={String(metrics.trades)}
          note={`from ${funnel.mondays} intraday Mondays`}
          strong
        />
        <Readout
          label="Expectancy"
          value={metrics.trades ? `${num(metrics.expectancy)} R` : '—'}
          note={metrics.trades ? `${pct(metrics.winRate)} win rate` : 'no trades at these settings'}
          strong
        />
        <Readout
          label="Planned reward"
          value={metrics.trades ? `${num(metrics.avgPlannedRR)} : 1` : '—'}
          note="average, before the outcome"
        />
        <Readout
          label="Worst drawdown"
          value={metrics.trades ? `${num(metrics.maxDrawdown, 1)} R` : '—'}
          note={risk ? `${pct(risk.p95Drawdown)} of capital at 1% risk, 95th pct` : 'needs trades'}
        />
      </dl>

      <p className="instrument__caveat">
        <strong>The two halves rest on different samples, and the smaller one is
        small.</strong>{' '}
        The setup figures come from {Math.round(scan.years)} years of daily bars.
        The trade figures come from {funnel.mondays} Mondays, because Yahoo gives away
        a rolling sixty days of intraday bars and refuses everything older — every
        session beyond that exists only because a previous build kept it, and the
        archive grows by seven a week. Read the trade column as a demonstration that
        the machinery runs, not as evidence that the edge is real.
      </p>
    </div>
  );
}

function median(values: number[]): number {
  if (values.length === 0) return NaN;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

function Control({
  label,
  value,
  min,
  max,
  step,
  current,
  onChange,
  hint,
}: {
  label: string;
  value: string;
  min: number;
  max: number;
  step: number;
  current: number;
  onChange: (v: number) => void;
  hint: string;
}) {
  return (
    <label className="instrument__control">
      <span className="mono-label">{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={current}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-valuetext={value}
      />
      <output>{value}</output>
      <small>{hint}</small>
    </label>
  );
}

function Readout({
  label,
  value,
  note,
  strong,
}: {
  label: string;
  value: string;
  note: string;
  strong?: boolean;
}) {
  return (
    <div className={`instrument__cell${strong ? ' is-strong' : ''}`}>
      <dt className="mono-label">{label}</dt>
      <dd>
        <span className="instrument__value">{value}</span>
        <span className="instrument__note">{note}</span>
      </dd>
    </div>
  );
}
