'use client';

/**
 * THE ENGINE, AS IT ACTUALLY RAN.
 *
 * Fourteen years of a gradient-boosted model choosing a book out of the S&P
 * 500, marked to market daily with borrow costs, a no-trade band and
 * regime-gated shorts. The curve is what the backtest produced; the caveat
 * under it is what the backtest is worth.
 *
 * ---
 * WHY THE CAVEAT IS NOT AT THE BOTTOM
 *
 * The headline is 22.40% a year against SPY's 14.85%, and that number is
 * INFLATED — measured, not suspected. Applying index membership as of each
 * row's own date cuts the model's information coefficient by 69%, from +0.0183
 * to +0.0057, and the most recent period turns negative.
 *
 * A page that shows the curve first and admits that in small type at the end is
 * doing the thing every backtest post does. The correction sits directly under
 * the number it corrects, because a reader who leaves after the headline should
 * still leave with the truth.
 */

import { useEffect, useMemo, useState } from 'react';
import { asset } from '@/lib/asset';
import { Reveal } from '@/components/motion/Reveal';
import survivorship from '@/content/survivorship.json';

type Metrics = {
  total: number;
  annual: number;
  vol: number;
  sharpe: number;
  maxDrawdown: number;
};

type Engine = {
  start: string;
  end: string;
  tradingDays: number;
  sampleStride: number;
  dates: string[];
  curve: number[];
  spy: number[];
  drawdown: { curve: number[]; spy: number[] };
  metrics: { strategy: Metrics; spy: Metrics };
  byYear: Array<{ year: string; strategy: number; spy: number; excess: number }>;
  rebalances: Array<{ date: string; exposure: number; longs: number; shorts: number; turnover: number }>;
  turnover: { mean: number; count: number };
};

const W = 760;
const H = 300;
const PAD = { top: 16, right: 16, bottom: 26, left: 46 };

const pct = (v: number) => `${(v * 100).toFixed(2)}%`;
const pct1 = (v: number) => `${(v * 100).toFixed(1)}%`;

export function EngineInstrument() {
  const [data, setData] = useState<Engine | null>(null);
  const [failed, setFailed] = useState(false);
  const [view, setView] = useState<'growth' | 'drawdown'>('growth');

  useEffect(() => {
    let alive = true;
    fetch(asset('/data/engine.json'))
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((j: Engine) => {
        if (alive) setData(j);
      })
      .catch(() => {
        if (alive) setFailed(true);
      });
    return () => {
      alive = false;
    };
  }, []);

  const geometry = useMemo(() => {
    if (!data) return null;
    const n = data.dates.length;
    const x = (i: number) => PAD.left + (i / (n - 1)) * (W - PAD.left - PAD.right);

    if (view === 'growth') {
      /*
        Log scale, and that is not a preference. Over fourteen years the book
        multiplies by fifteen; on a linear axis the first eight years lie flat
        against the bottom and the whole picture becomes the last two. Equal
        vertical distances have to mean equal PERCENTAGE moves, or the chart
        argues for something the returns do not.
      */
      const all = [...data.curve, ...data.spy];
      const lo = Math.log(Math.min(...all));
      const hi = Math.log(Math.max(...all));
      const y = (v: number) =>
        PAD.top + (1 - (Math.log(v) - lo) / (hi - lo)) * (H - PAD.top - PAD.bottom);
      const ticks = [1, 2, 5, 10, 15].filter((t) => Math.log(t) >= lo && Math.log(t) <= hi);
      return { x, y, ticks, fmt: (t: number) => `${t}x` };
    }

    const worst = Math.min(...data.drawdown.curve, ...data.drawdown.spy);
    const y = (v: number) => PAD.top + (v / worst) * (H - PAD.top - PAD.bottom);
    const ticks = [0, -0.1, -0.2, -0.3].filter((t) => t >= worst);
    return { x, y, ticks, fmt: (t: number) => `${Math.round(t * 100)}%` };
  }, [data, view]);

  if (failed) {
    return (
      <div className="instrument">
        <p className="instrument__caveat">
          The backtest data did not load. Nothing on this instrument is computed in
          the browser, so there is nothing to show rather than something
          approximate.
        </p>
      </div>
    );
  }

  if (!data || !geometry) {
    return (
      <div className="instrument">
        <p className="instrument__note">Loading fourteen years of the book…</p>
      </div>
    );
  }

  const series = view === 'growth' ? data.curve : data.drawdown.curve;
  const benchmark = view === 'growth' ? data.spy : data.drawdown.spy;
  const line = (values: number[]) =>
    values
      .map((v, i) => `${i ? 'L' : 'M'} ${geometry.x(i).toFixed(1)} ${geometry.y(v).toFixed(1)}`)
      .join(' ');

  const icDrop = Math.abs(
    Math.round(
      ((survivorship.meanIC.pointInTime - survivorship.meanIC.biased) /
        survivorship.meanIC.biased) *
        100,
    ),
  );
  const ahead = data.byYear.filter((y) => y.excess > 0).length;

  return (
    <div className="instrument">
      <Reveal className="instrument__head">
        <p className="instrument__tag">Walk-forward, {data.start.slice(0, 4)}&ndash;{data.end.slice(0, 4)}</p>
        <h3 className="instrument__title">What the engine did, and what it is worth</h3>
        <p className="instrument__sub">
          A gradient-boosted model scoring the S&amp;P 500 every day, held in a book
          that marks to market daily and pays to borrow what it shorts. The curve is
          the run. The paragraph under it is the correction.
        </p>
      </Reveal>

      <div className="instrument__controls">
        <label className="instrument__control">
          <span>View</span>
          <select value={view} onChange={(e) => setView(e.target.value as 'growth' | 'drawdown')}>
            <option value="growth">Growth of $1</option>
            <option value="drawdown">Drawdown</option>
          </select>
        </label>
      </div>

      <figure className="instrument__figure">
        <svg
          className="instrument__svg"
          viewBox={`0 0 ${W} ${H}`}
          role="img"
          aria-label={`${view === 'growth' ? 'Growth of one dollar' : 'Drawdown'}, the book against SPY, ${data.start} to ${data.end}`}
        >
          {geometry.ticks.map((t) => (
            <g key={t}>
              <line
                className="instrument__baseline"
                x1={PAD.left}
                x2={W - PAD.right}
                y1={geometry.y(t)}
                y2={geometry.y(t)}
              />
              <text className="instrument__axis" x={PAD.left - 8} y={geometry.y(t) + 4} textAnchor="end">
                {geometry.fmt(t)}
              </text>
            </g>
          ))}

          <path d={line(benchmark)} fill="none" stroke="currentColor" strokeWidth={1.2} opacity={0.35} />
          <path
            d={line(series)}
            fill="none"
            stroke="currentColor"
            strokeWidth={1.8}
            className="instrument__walk"
          />

          <text className="instrument__axis" x={PAD.left} y={H - 8}>
            {data.start}
          </text>
          <text className="instrument__axis" x={W - PAD.right} y={H - 8} textAnchor="end">
            {data.end}
          </text>
        </svg>
        <figcaption className="instrument__note">
          Solid is the book, faint is SPY. Drawn from every {data.sampleStride}th trading
          day — every figure quoted below is computed on all{' '}
          {data.tradingDays.toLocaleString()}.
        </figcaption>
      </figure>

      <dl className="instrument__readout">
        <div className="instrument__cell">
          <dt>Annualised</dt>
          <dd className="instrument__value">{pct(data.metrics.strategy.annual)}</dd>
          <dd className="instrument__plain">SPY {pct(data.metrics.spy.annual)}</dd>
        </div>
        <div className="instrument__cell">
          <dt>Sharpe</dt>
          <dd className="instrument__value">{data.metrics.strategy.sharpe.toFixed(2)}</dd>
          <dd className="instrument__plain">SPY {data.metrics.spy.sharpe.toFixed(2)}</dd>
        </div>
        <div className="instrument__cell">
          <dt>Max drawdown</dt>
          <dd className="instrument__value">{pct(data.metrics.strategy.maxDrawdown)}</dd>
          <dd className="instrument__plain">SPY {pct(data.metrics.spy.maxDrawdown)}</dd>
        </div>
        <div className="instrument__cell">
          <dt>Years ahead</dt>
          <dd className="instrument__value">
            {ahead} of {data.byYear.length}
          </dd>
          <dd className="instrument__plain">{data.turnover.count} rebalances</dd>
        </div>
      </dl>

      {/*
        Directly under the headline, not at the foot of the page. A reader who
        stops after the big number should still stop with the truth.
      */}
      <p className="instrument__caveat">
        <strong>That result is inflated, and by a measured amount.</strong> The
        universe is the index as it stands today, so every company that failed or
        was dropped is missing from all fourteen years. Applying membership as of
        each row&rsquo;s own date cuts the model&rsquo;s information coefficient by{' '}
        {icDrop}% — from +{survivorship.meanIC.biased.toFixed(4)} to +
        {survivorship.meanIC.pointInTime.toFixed(4)} across {survivorship.splits}{' '}
        purged cross-validation splits, and the most recent period turns negative.
        The curve above was produced by a model with roughly three times the skill
        it actually has.
      </p>
      <p className="instrument__caveat instrument__caveat--quiet">
        That is a lower bound. Dating membership removes companies that were not yet
        in the index; it cannot recover the ones dropped after failing, because
        their prices are gone. Index membership is now snapshotted weekly, which
        makes this answerable properly in a few years and not before.
      </p>

      <figure className="instrument__figure">
        <figcaption className="instrument__note">Calendar years, the book against SPY</figcaption>
        <table className="engine__years">
          <thead>
            <tr>
              <th scope="col">Year</th>
              <th scope="col">Book</th>
              <th scope="col">SPY</th>
              <th scope="col">Excess</th>
            </tr>
          </thead>
          <tbody>
            {data.byYear.map((y) => (
              <tr key={y.year}>
                <th scope="row">{y.year}</th>
                <td>{pct1(y.strategy)}</td>
                <td>{pct1(y.spy)}</td>
                <td data-sign={y.excess >= 0 ? 'up' : 'down'}>
                  {y.excess >= 0 ? '+' : ''}
                  {pct1(y.excess)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </figure>
    </div>
  );
}
