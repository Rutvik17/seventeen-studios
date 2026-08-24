'use client';

/**
 * The liquidity-sweep desk.
 *
 * Pick a name, pick a range, and the model is run over it: every setup it found,
 * every trade it took, drawn on the candles it took them on, and what the
 * balance did as a result.
 *
 * ---
 *
 * THE QUESTION THIS ANSWERS
 *
 * "If we had followed this strategy, what would we have made." Not "is the setup
 * statistically interesting" — that is a different question, and answering it
 * instead of this one is a way of avoiding the scoreboard.
 *
 * So the account is the headline: a starting balance, a risk budget per trade,
 * and where it ended up. R-multiples are still underneath — they are the only
 * unit in which a $180 name and a $900 one are comparable — but they are shown
 * as a consequence rather than as the result.
 *
 * ---
 *
 * WHAT THE RANGES CAN AND CANNOT SHOW
 *
 * One day, five days and one month draw fifteen-minute candles, which is the
 * only resolution the model can be read at: a bearish fair value gap appears in
 * 92.9% of fifteen-minute sessions and 32.1% of hourly ones, so a coarser bar
 * does not approximate the entry, it erases it.
 *
 * Six months, year-to-date and one year draw daily candles, the way any platform
 * does at that width — and trades on them are marked on the session rather than
 * the bar, because a fifteen-minute gap cannot be drawn on a daily candle
 * honestly.
 *
 * Nothing reaches further back than a year, because the intraday archive does
 * not: Yahoo serves a rolling sixty days and refuses older windows, so the only
 * copy of anything behind that wall is the one this site keeps. The window rolls
 * at a year — see `scripts/fetch-sweep.mjs`.
 */

import { useDeferredValue, useMemo, useState } from 'react';
import {
  DEFAULTS,
  backtest,
  simulateAccount,
  type IntradayBar,
  type SweepParams,
} from '@/lib/sweep';
import { sweepMeta, sweepTicker } from '@/content/sweep';
import { SweepChart, type Candle } from '@/components/instruments/SweepChart';
import { Reveal } from '@/components/motion/Reveal';

/**
 * The ranges, and which series each one draws.
 *
 * `sessions` counts trading days, not calendar days — the axis is built from
 * bars, so counting the days the market was shut would silently shorten every
 * range by two sevenths.
 */
const RANGES = [
  { key: '1d', label: '1D', sessions: 1, intraday: true },
  { key: '5d', label: '5D', sessions: 5, intraday: true },
  { key: '1m', label: '1M', sessions: 22, intraday: true },
  { key: '6m', label: '6M', sessions: 126, intraday: false },
  { key: 'ytd', label: 'YTD', sessions: 0, intraday: false },
  { key: '1y', label: '1Y', sessions: 252, intraday: false },
] as const;

type RangeKey = (typeof RANGES)[number]['key'];

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

const STARTING = 25_000;
const RISK = 0.01;

const money = (v: number) =>
  v.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const pct = (v: number, digits = 1) =>
  Number.isFinite(v) ? `${(v * 100).toFixed(digits)}%` : '—';
const signed = (v: number) => `${v >= 0 ? '+' : ''}${pct(v)}`;

export function SweepInstrument() {
  const [symbol, setSymbol] = useState(sweepMeta.symbols[0].symbol);
  const [rangeKey, setRangeKey] = useState<RangeKey>('5d');
  const [sweepAtr, setSweepAtr] = useState(DEFAULTS.sweepAtr);
  const [minRewardRisk, setMinRewardRisk] = useState(DEFAULTS.minRewardRisk);
  /** A session the reader asked to see up close, overriding the range. */
  const [focus, setFocus] = useState<string | null>(null);

  /*
    Deferred as two primitives rather than one object, for the reason the risk
    desk gives: `useDeferredValue` on a fresh object is a new reference every
    render and defers nothing at all.
  */
  const dSweep = useDeferredValue(sweepAtr);
  const dReward = useDeferredValue(minRewardRisk);

  const ticker = useMemo(() => sweepTicker(symbol), [symbol]);
  const range = RANGES.find((r) => r.key === rangeKey) ?? RANGES[1];

  /** What the archive can currently draw, which is what gates the ranges. */
  const available = useMemo(
    () => ({
      sessions: ticker ? Object.keys(ticker.sessions).length : 0,
      days: ticker ? ticker.daily.length : 0,
    }),
    [ticker],
  );

  const params: Partial<SweepParams> = useMemo(
    () => ({ sweepAtr: dSweep, minRewardRisk: dReward }),
    [dSweep, dReward],
  );

  /* The candles for this range, and the dates they span. */
  const view = useMemo(() => {
    if (!ticker) return null;

    /*
      A trade the reader asked to see, rather than the tail of the range.

      Without this the markers are decoration. A month of fifteen-minute bars is
      566 candles across nine hundred pixels, so a trade inside it is about two
      pixels wide — drawn correctly, and impossible to look at. The ranges are
      all anchored to "the most recent N sessions", so there was no way to get to
      one either.

      Focusing shows the session the trade opened on and the one after it,
      because a trade that runs overnight exits on the following day and half a
      trade is a worse picture than none.
    */
    if (focus) {
      const all = Object.keys(ticker.sessions).sort();
      const at = all.indexOf(focus);
      const days = at === -1 ? [] : all.slice(at, at + 2);
      const candles: Candle[] = [];
      for (const date of days) {
        for (const bar of ticker.sessions[date]) {
          candles.push({
            label: `${bar.time}`,
            date,
            time: bar.time,
            open: bar.open,
            high: bar.high,
            low: bar.low,
            close: bar.close,
          });
        }
      }
      if (candles.length > 0) {
        return { candles, from: days[0], to: days[days.length - 1], focused: true };
      }
    }

    if (range.intraday) {
      const days = Object.keys(ticker.sessions).sort().slice(-range.sessions);
      const candles: Candle[] = [];
      for (const date of days) {
        for (const bar of ticker.sessions[date]) {
          candles.push({
            label: range.sessions === 1 ? bar.time : shortDate(date),
            date,
            time: bar.time,
            open: bar.open,
            high: bar.high,
            low: bar.low,
            close: bar.close,
          });
        }
      }
      return { candles, from: days[0], to: days[days.length - 1] };
    }

    const bars =
      range.key === 'ytd'
        ? ticker.daily.filter((b) => b.date >= `${new Date().getUTCFullYear()}-01-01`)
        : ticker.daily.slice(-range.sessions);

    return {
      candles: bars.map((b) => ({
        label: shortDate(b.date),
        date: b.date,
        open: b.open,
        high: b.high,
        low: b.low,
        close: b.close,
      })),
      from: bars[0]?.date ?? '',
      to: bars[bars.length - 1]?.date ?? '',
    };
  }, [ticker, range, focus]);

  /*
    The span the NUMBERS cover, which is the range and not the zoom.

    Focusing a trade moves the chart to two days; it must not move the account
    with it. A balance that changes because the reader clicked a row to look at
    something is not a backtest result, it is a different backtest — and the one
    number on this page that has to hold still is the one that says what the
    strategy made.
  */
  const span = useMemo(() => {
    if (!ticker) return null;
    if (range.intraday) {
      const days = Object.keys(ticker.sessions).sort().slice(-range.sessions);
      return { from: days[0] ?? '', to: days[days.length - 1] ?? '' };
    }
    const bars =
      range.key === 'ytd'
        ? ticker.daily.filter((b) => b.date >= `${new Date().getUTCFullYear()}-01-01`)
        : ticker.daily.slice(-range.sessions);
    return { from: bars[0]?.date ?? '', to: bars[bars.length - 1]?.date ?? '' };
  }, [ticker, range]);

  /*
    The model, over exactly that span.

    Scoped by filtering the sessions rather than the trades, so the funnel counts
    the Mondays in view too. Counting setups over five years and trades over a
    month would put two different denominators side by side.
  */
  const run = useMemo(() => {
    if (!ticker || !span) return null;
    const scoped: Record<string, IntradayBar[]> = {};
    for (const [date, bars] of Object.entries(ticker.sessions)) {
      if (date >= span.from && date <= span.to) scoped[date] = bars;
    }
    return backtest(ticker.daily, scoped, params);
  }, [ticker, span, params]);

  const account = useMemo(
    () => (run ? simulateAccount(run.trades, { starting: STARTING, risk: RISK }) : null),
    [run],
  );

  if (!ticker || !view || !run || !account) return null;

  const wins = run.trades.filter((t) => t.r > 0).length;
  const grew = account.ending >= account.starting;

  return (
    <div className="instrument sweep">
      <Reveal className="instrument__head">
        <div>
          <span className="mono-label instrument__tag">
            {sweepMeta.symbols.length} names · {sweepMeta.interval} bars ·{' '}
            {available.sessions} sessions a name
          </span>
          <h3 className="instrument__title">
            If we had traded this, what would it have made?
          </h3>
          <p className="instrument__sub">
            Thursday tops out. Friday fails to beat it and closes weak. Monday morning
            price is walked back up into Thursday&rsquo;s high, and the model sells the
            gap left behind when it drops. Every trade it took is on the chart.
          </p>
        </div>
      </Reveal>

      <div className="sweep__bar">
        <div className="sweep__picker" role="group" aria-label="Ticker">
          {sweepMeta.symbols.map((entry) => (
            <button
              key={entry.symbol}
              type="button"
              className={`sweep__ticker${entry.symbol === symbol ? ' is-active' : ''}`}
              aria-pressed={entry.symbol === symbol}
              onClick={() => { setSymbol(entry.symbol); setFocus(null); }}
            >
              {entry.symbol}
            </button>
          ))}
        </div>

        {/*
          A range is offered only when there are bars to draw it with.

          The intraday archive starts at sixty sessions and grows by five a week
          off the daily rebuild, so a range that is short today is not broken —
          it is early. Disabling it says that, where drawing a one-month chart
          out of three weeks of candles would quietly lie about the window.
        */}
        <div className="sweep__ranges" role="group" aria-label="Range">
          {RANGES.map((entry) => {
            const have = entry.intraday ? available.sessions : available.days;
            const short = entry.key !== 'ytd' && have < entry.sessions;
            return (
              <button
                key={entry.key}
                type="button"
                className={`sweep__range${entry.key === rangeKey ? ' is-active' : ''}`}
                aria-pressed={entry.key === rangeKey}
                disabled={short}
                title={
                  short
                    ? `Needs ${entry.sessions} sessions, has ${have}. The archive grows every trading day.`
                    : undefined
                }
                onClick={() => { setRangeKey(entry.key); setFocus(null); }}
              >
                {entry.label}
              </button>
            );
          })}
        </div>
      </div>

      <figure className="instrument__figure sweep__figure">
        <figcaption className="mono-label sweep__caption">
          <span>
            {ticker.name} · {view.candles.length}{' '}
            {view.focused || range.intraday ? `${sweepMeta.interval} candles` : 'daily candles'} ·{' '}
            {shortDate(view.from)} to {shortDate(view.to)}
          </span>
          {view.focused ? (
            <button type="button" className="sweep__unfocus" onClick={() => setFocus(null)}>
              back to {range.label}
            </button>
          ) : null}
        </figcaption>
        <SweepChart
          candles={view.candles}
          trades={run.trades}
          intraday={Boolean(view.focused) || range.intraday}
        />
        <p className="sweep__legend">
          <span className="sweep__key sweep__key--gap" /> fair value gap
          <span className="sweep__key sweep__key--entry" /> entry
          <span className="sweep__key sweep__key--win" /> closed at target
          <span className="sweep__key sweep__key--loss" /> stopped out
        </p>
      </figure>

      <div className="instrument__controls">
        <Control
          label="Counts as a sweep"
          value={`within ${sweepAtr.toFixed(2)} ATR of Thursday's high`}
          min={0}
          max={2}
          step={0.05}
          current={sweepAtr}
          onChange={setSweepAtr}
          hint="Zero means it must actually touch the high."
        />
        <Control
          label="Least reward accepted"
          value={`${minRewardRisk.toFixed(2)} : 1`}
          min={0.5}
          max={5}
          step={0.25}
          current={minRewardRisk}
          onChange={setMinRewardRisk}
          hint="Skip setups whose target is too near the stop."
        />
      </div>

      <dl className="instrument__readout">
        <Readout
          label="Setups seen"
          value={String(run.funnel.mondays - run.funnel['holiday-week'])}
          note={`Mondays in range · ${run.funnel.traded} became trades`}
        />
        <Readout
          label="Trades"
          value={String(run.trades.length)}
          note={
            run.trades.length
              ? `${wins} won, ${run.trades.length - wins} lost`
              : 'nothing qualified in this range'
          }
        />
        <Readout
          label="Started with"
          value={money(account.starting)}
          note={`risking ${pct(RISK, 0)} a trade`}
        />
        <Readout
          label="Ended with"
          value={money(account.ending)}
          note={run.trades.length ? `${signed(account.returnPct)} on the range` : 'unchanged'}
          strong
          tone={run.trades.length ? (grew ? 'up' : 'down') : undefined}
        />
        <Readout
          label="Worst dip"
          value={account.fills.length ? pct(account.maxDrawdownPct) : '—'}
          note="peak to trough, on the balance"
        />
        <Readout
          label="Edge"
          value={run.trades.length ? `${run.metrics.expectancy.toFixed(2)} R` : '—'}
          note={run.trades.length ? `per trade · ${pct(run.metrics.winRate)} win rate` : 'needs trades'}
        />
      </dl>

      {/*
        Where the Mondays went.

        This was dropped when the chart went in, and the instrument immediately
        became worse: it reported zero trades with nothing to say about why, and
        a strategy that finds nothing is indistinguishable from one that is
        broken. Each row is a share of every Monday in the range, so the rows sum
        to the whole rather than each being a percentage of whatever was left.
      */}
      <ul className="sweep__funnel">
        {STAGES.map(([key, label]) => {
          const value = run.funnel[key];
          if (value === 0) return null;
          return (
            <li key={key} className="sweep__stage">
              <span className="sweep__stage-label">{label}</span>
              <span className="sweep__stage-bar" aria-hidden="true">
                <i style={{ width: `${(value / Math.max(1, run.funnel.mondays)) * 100}%` }} />
              </span>
              <span className="sweep__stage-count">{value}</span>
            </li>
          );
        })}
        <li className="sweep__stage sweep__stage--out">
          <span className="sweep__stage-label">Traded</span>
          <span className="sweep__stage-bar" aria-hidden="true">
            <i style={{ width: `${(run.funnel.traded / Math.max(1, run.funnel.mondays)) * 100}%` }} />
          </span>
          <span className="sweep__stage-count">{run.funnel.traded}</span>
        </li>
      </ul>

      {account.fills.length > 0 ? (
        <table className="sweep__trades">
          <caption className="mono-label">Every trade, in order</caption>
          <thead>
            <tr>
              <th scope="col">Monday</th>
              <th scope="col">Entry</th>
              <th scope="col">Exit</th>
              <th scope="col">Shares</th>
              <th scope="col">Result</th>
              <th scope="col">P&amp;L</th>
              <th scope="col">Balance</th>
            </tr>
          </thead>
          <tbody>
            {account.fills.map((fill) => (
              <tr
                key={fill.trade.monday}
                className={`${fill.pnl >= 0 ? 'is-win' : 'is-loss'}${fill.trade.monday === focus ? ' is-focused' : ''}`}
                onClick={() => setFocus(fill.trade.monday)}
                tabIndex={0}
                role="button"
                aria-label={`Show ${fill.trade.monday} on the chart`}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setFocus(fill.trade.monday); } }}
              >
                <td>{shortDate(fill.trade.monday)}</td>
                <td>{fill.trade.entry.toFixed(2)}</td>
                <td>{fill.trade.exit.toFixed(2)}</td>
                <td>{fill.shares}</td>
                <td>{fill.trade.outcome}</td>
                <td>{`${fill.pnl >= 0 ? '+' : '−'}${money(Math.abs(fill.pnl))}`}</td>
                <td>{money(fill.balance)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}

      <p className="instrument__caveat">
        <strong>A backtest is not a track record.</strong> Every losing assumption here
        is resolved against the trader — a bar covering both stop and target counts as
        the stop, the limit only fills if a later bar actually reached it, and nothing
        reads a price it would not have had. What is not modelled is commission, the
        spread, and the fact that a real fill at the top of a gap is a hope rather than a
        certainty. The sample is also small and stays small: the intraday archive rolls
        at a year, because the bars behind that cannot be bought back.
      </p>
    </div>
  );
}

/** `2026-08-24` → `24 Aug 26`. Short enough for an axis, unambiguous anywhere. */
function shortDate(date: string): string {
  if (!date) return '';
  const [y, m, d] = date.split('-');
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${Number(d)} ${months[Number(m) - 1]} ${y.slice(2)}`;
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
  tone,
}: {
  label: string;
  value: string;
  note: string;
  strong?: boolean;
  tone?: 'up' | 'down';
}) {
  return (
    <div className={`instrument__cell${strong ? ' is-strong' : ''}`}>
      <dt className="mono-label">{label}</dt>
      <dd>
        <span className={`instrument__value${tone ? ` is-${tone}` : ''}`}>{value}</span>
        <span className="instrument__note">{note}</span>
      </dd>
    </div>
  );
}
