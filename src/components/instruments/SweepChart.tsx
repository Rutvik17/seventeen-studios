'use client';

/**
 * A candlestick chart with the backtest drawn on it.
 *
 * The gap the model sold into, the bar the limit filled on, and the bar it left
 * on — marked where they happened, on the candles they happened to. A backtest
 * that reports only a number asks to be believed; one you can look at can be
 * checked, and the first thing anyone should do with a strategy's results is
 * look at the trades it claims to have taken.
 *
 * ---
 *
 * WHY THE X AXIS IS AN INDEX AND NOT A TIME
 *
 * Bars are drawn evenly spaced, one slot each, regardless of the clock. That is
 * how every trading platform draws a chart and it is not laziness: a real time
 * axis leaves a gap every night and a wider one every weekend, so two thirds of
 * the width is spent drawing the hours the market was shut. Compressing to
 * traded bars is what makes the price legible.
 *
 * The cost is that the axis is not linear in time, which matters for reading a
 * rate and not at all for reading a pattern. Labels carry the real dates.
 *
 * ---
 *
 * WHY IT SWITCHES TO A LINE
 *
 * A candle needs about two pixels to show a body and a wick. A year of
 * fifteen-minute bars across nine hundred pixels gives each one a third of a
 * pixel, and drawing candles at that width produces a grey smear that says less
 * than a line would. Past the threshold it draws closes instead — again, what
 * every platform does, and for the same reason.
 */

import { useMemo } from 'react';
import type { Trade } from '@/lib/sweep';

export type Candle = {
  /** What the axis calls it: a date, or a date and a time. */
  label: string;
  /** The session this bar belongs to, for matching trades to bars. */
  date: string;
  /** Wall-clock start, on intraday bars only. */
  time?: string;
  open: number;
  high: number;
  low: number;
  close: number;
};

const W = 940;
const H = 380;
const PAD = { top: 16, right: 62, bottom: 26, left: 12 };

/**
 * Below this width per bar, candles stop being readable and become a line.
 *
 * 1.4px is where a body and a wick can no longer be told apart — a month of
 * fifteen-minute bars lands at about 1.5, which is thin but still price-accurate,
 * and a year of them lands well under and becomes a line.
 */
const MIN_CANDLE_WIDTH = 1.4;

export function SweepChart({
  candles,
  trades,
  intraday,
}: {
  candles: Candle[];
  trades: Trade[];
  /** Intraday bars can carry gap boxes; daily bars cannot. */
  intraday: boolean;
}) {
  const geometry = useMemo(() => {
    if (candles.length === 0) return null;

    const plotWidth = W - PAD.left - PAD.right;
    const plotHeight = H - PAD.top - PAD.bottom;

    let low = Infinity;
    let high = -Infinity;
    for (const c of candles) {
      low = Math.min(low, c.low);
      high = Math.max(high, c.high);
    }

    /*
      The visible trades widen the scale if they need to. A stop sitting just
      above the highest candle would otherwise be drawn on the frame's edge or
      outside it, and a level you cannot see is not a level.
    */
    for (const t of trades) {
      low = Math.min(low, t.target, t.exit);
      high = Math.max(high, t.stop);
    }

    const span = high - low || 1;
    const pad = span * 0.06;
    const top = high + pad;
    const bottom = low - pad;

    const slot = plotWidth / candles.length;
    const body = Math.max(1, Math.min(slot * 0.68, 14));

    return {
      slot,
      body,
      asLine: slot < MIN_CANDLE_WIDTH,
      x: (i: number) => PAD.left + i * slot + slot / 2,
      y: (price: number) =>
        PAD.top + plotHeight - ((price - bottom) / (top - bottom)) * plotHeight,
      bottom,
      top,
    };
  }, [candles, trades]);

  /*
    Trades matched to bar positions.

    A trade knows the session it happened in and the wall-clock time of each
    event; the chart knows which slot each bar occupies. This is where the two
    meet — and it silently drops anything it cannot place, because a marker on
    the wrong candle is worse than no marker.
  */
  const marks = useMemo(() => {
    if (!geometry) return [];

    const index = new Map<string, number>();
    candles.forEach((c, i) => {
      index.set(c.time ? `${c.date} ${c.time}` : c.date, i);
      // Daily charts place every event on the session it happened in.
      if (!index.has(c.date)) index.set(c.date, i);
    });

    const at = (date: string, time?: string) =>
      (time !== undefined ? index.get(`${date} ${time}`) : undefined) ?? index.get(date);

    return trades.flatMap((trade) => {
      const entryIndex = at(trade.monday, intraday ? trade.entryAt : undefined);
      if (entryIndex === undefined) return [];

      const exitIndex =
        at(trade.exitDate, intraday ? trade.exitAt : undefined) ?? entryIndex;
      const gapIndex = at(trade.monday, intraday ? trade.gapAt : undefined) ?? entryIndex;

      return [{ trade, entryIndex, exitIndex, gapIndex }];
    });
  }, [trades, candles, geometry, intraday]);

  if (!geometry) {
    return (
      <p className="sweep__empty">
        No bars in this range. The intraday archive only reaches back a year.
      </p>
    );
  }

  const { x, y, slot, body, asLine } = geometry;

  // Five price gridlines, on round-ish numbers the eye can hold.
  const ticks = Array.from({ length: 5 }, (_, i) =>
    geometry.bottom + ((geometry.top - geometry.bottom) * (i + 0.5)) / 5,
  );

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="sweep__chart"
      role="img"
      aria-label={
        `${candles.length} ${intraday ? '15-minute' : 'daily'} candles` +
        `${marks.length ? `, with ${marks.length} trade${marks.length === 1 ? '' : 's'} marked` : ''}`
      }
    >
      {ticks.map((price) => (
        <g key={price}>
          <line
            x1={PAD.left}
            y1={y(price)}
            x2={W - PAD.right}
            y2={y(price)}
            className="sweep__grid"
          />
          <text x={W - PAD.right + 6} y={y(price) + 3.5} className="sweep__price">
            {price.toFixed(price > 200 ? 0 : 1)}
          </text>
        </g>
      ))}

      {/*
        The gap, drawn before the candles so price sits on top of it. It extends
        from the bar that completed it to the bar that filled it — which is
        exactly the span over which the gap was an unfilled inefficiency.
      */}
      {intraday
        ? marks.map(({ trade, gapIndex, entryIndex }) => (
            <rect
              key={`gap-${trade.monday}`}
              x={x(gapIndex) - slot / 2}
              y={y(trade.gap[1])}
              width={Math.max(slot, x(entryIndex) - x(gapIndex) + slot)}
              height={Math.max(1, y(trade.gap[0]) - y(trade.gap[1]))}
              className="sweep__gap"
            />
          ))
        : null}

      {asLine ? (
        <path
          d={candles.map((c, i) => `${i ? 'L' : 'M'}${x(i)} ${y(c.close)}`).join(' ')}
          className="sweep__line"
        />
      ) : (
        candles.map((c, i) => {
          const up = c.close >= c.open;
          const bodyTop = y(Math.max(c.open, c.close));
          const bodyBottom = y(Math.min(c.open, c.close));
          return (
            <g key={i} className={up ? 'sweep__candle is-up' : 'sweep__candle is-down'}>
              <line x1={x(i)} y1={y(c.high)} x2={x(i)} y2={y(c.low)} />
              <rect
                x={x(i) - body / 2}
                y={bodyTop}
                width={body}
                // A doji has no body; one pixel keeps it visible.
                height={Math.max(1, bodyBottom - bodyTop)}
              />
            </g>
          );
        })
      )}

      {/* Entry, exit, and the levels the trade was working against. */}
      {marks.map(({ trade, entryIndex, exitIndex }) => {
        const won = trade.r > 0;
        return (
          <g key={`trade-${trade.monday}`} className="sweep__trade">
            <line
              x1={x(entryIndex)}
              y1={y(trade.stop)}
              x2={x(exitIndex)}
              y2={y(trade.stop)}
              className="sweep__stop"
            />
            <line
              x1={x(entryIndex)}
              y1={y(trade.target)}
              x2={x(exitIndex)}
              y2={y(trade.target)}
              className="sweep__target"
            />
            <line
              x1={x(entryIndex)}
              y1={y(trade.entry)}
              x2={x(exitIndex)}
              y2={y(trade.exit)}
              className={won ? 'sweep__path is-win' : 'sweep__path is-loss'}
            />

            {/* Short entry: the marker points down, the way the trade does. */}
            <path
              d={`M${x(entryIndex)} ${y(trade.entry) - 13} l5 -7 h-10 z`}
              className="sweep__marker is-entry"
            />
            <circle
              cx={x(exitIndex)}
              cy={y(trade.exit)}
              r={3.6}
              className={won ? 'sweep__marker is-win' : 'sweep__marker is-loss'}
            />
          </g>
        );
      })}

      {/* Three date labels: both ends and the middle. */}
      {[0, Math.floor(candles.length / 2), candles.length - 1].map((i, n) => (
        <text
          key={i}
          x={x(i)}
          y={H - 8}
          className="sweep__axis"
          textAnchor={n === 0 ? 'start' : n === 2 ? 'end' : 'middle'}
        >
          {candles[i].label}
        </text>
      ))}
    </svg>
  );
}
