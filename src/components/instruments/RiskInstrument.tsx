'use client';

/**
 * A risk desk on six real companies.
 *
 * Every number that goes in is measured from two years of actual daily closes:
 * each name's volatility, its drift, and the correlations between all fifteen
 * pairs. Nothing here is a placeholder — earlier versions of this panel ran on
 * a hardcoded 18% volatility over an abstract million dollars, which produced
 * correct arithmetic about a portfolio that did not exist.
 *
 * ---
 *
 * WHY IT SHOWS THE NAMES
 *
 * The first version showed "a $1,000,000 book" and nothing else, and it was
 * unreadable to anyone who did not already know what value at risk was. There
 * was nothing to hold on to: no companies, no weights, no sense of why six of
 * anything is better than one.
 *
 * So the holdings are named, their weights are yours to move, and the panel
 * states in words what the simulation is doing. The maths did not change. What
 * changed is that you can now disagree with it.
 *
 * ---
 *
 * THE DIVERSIFICATION LINE IS THE POINT
 *
 * The single most useful fact in portfolio theory is that the risk of a
 * portfolio is LESS than the average risk of the things in it, as long as they
 * do not move in perfect lockstep. That is not an opinion or a strategy — it
 * falls out of the covariance algebra — and it is invisible unless something
 * shows you both numbers side by side. So the panel prints both.
 */

import { useDeferredValue, useMemo, useState } from 'react';
import {
  formatCurrency,
  formatPercent,
  simulateFan,
  simulatePortfolio,
  type Holding,
} from '@/lib/quant';
import { market } from '@/content/market';
import { Reveal } from '@/components/motion/Reveal';

const NOTIONAL = 1_000_000;
const PATHS = 25_000;
const SEED = 20260822;

const W = 760;
const H = 260;
const PAD = { top: 18, right: 16, bottom: 30, left: 74 };

/** Equal weights to begin with — the honest default when you have no view. */
const INITIAL = market.assets.map(() => Math.round(100 / market.assets.length));

export function RiskInstrument() {
  const [raw, setRaw] = useState<number[]>(INITIAL);
  const [horizonDays, setHorizonDays] = useState(63);
  const [alpha, setAlpha] = useState(0.05);

  /*
    Deferred as four primitives, never as one object. `useDeferredValue` on an
    inline object is an infinite render loop — a new identity every render means
    the deferred pass always differs from the one that scheduled it. Weights are
    joined to a string for the same reason: a stable primitive.
  */
  const weightKey = useDeferredValue(raw.join(','));
  const dHorizon = useDeferredValue(horizonDays);
  const dAlpha = useDeferredValue(alpha);

  const holdings: Holding[] = useMemo(() => {
    const values = weightKey.split(',').map(Number);
    const total = values.reduce((s, v) => s + v, 0) || 1;
    return market.assets.map((asset, i) => ({
      symbol: asset.symbol,
      name: asset.name,
      weight: values[i] / total,
      drift: asset.drift,
      volatility: asset.volatility,
    }));
  }, [weightKey]);

  const result = useMemo(
    () =>
      simulatePortfolio(holdings, market.correlations, {
        notional: NOTIONAL,
        horizonDays: dHorizon,
        alpha: dAlpha,
        paths: PATHS,
        seed: SEED,
      }),
    [holdings, dHorizon, dAlpha],
  );

  const fan = useMemo(
    () =>
      result
        ? simulateFan({
            notional: NOTIONAL,
            drift: result.drift,
            volatility: result.volatility,
            horizonDays: dHorizon,
            seed: SEED,
          })
        : null,
    [result, dHorizon],
  );

  const fanGeom = useMemo(() => {
    if (!fan) return null;
    const all = fan.bands.flatMap((b) => [...b.hi, ...b.lo]);
    const lo = Math.min(...all);
    const hi = Math.max(...all);
    const x = (i: number) => PAD.left + (i / fan.steps) * (W - PAD.left - PAD.right);
    const y = (v: number) =>
      PAD.top + (1 - (v - lo) / (hi - lo || 1)) * (H - PAD.top - PAD.bottom);
    const bandPath = (b: (typeof fan.bands)[number]) => {
      const up = b.hi.map((v, i) => `${i === 0 ? 'M' : 'L'} ${x(i).toFixed(1)} ${y(v).toFixed(1)}`);
      const down = b.lo.map((v, i) => ({ v, i })).reverse()
        .map(({ v, i }) => `L ${x(i).toFixed(1)} ${y(v).toFixed(1)}`);
      return `${up.join(' ')} ${down.join(' ')} Z`;
    };
    const line = (vals: number[]) =>
      vals.map((v, i) => `${i === 0 ? 'M' : 'L'} ${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(' ');
    return { x, y, bandPath, line };
  }, [fan]);

  const histGeom = useMemo(() => {
    if (!result) return null;
    const bins = result.histogram;
    const maxCount = Math.max(...bins.map((b) => b.count)) || 1;
    const lo = bins[0].x0;
    const hi = bins[bins.length - 1].x1;
    const x = (v: number) => PAD.left + ((v - lo) / (hi - lo || 1)) * (W - PAD.left - PAD.right);
    const h = (c: number) => (c / maxCount) * (H - PAD.top - PAD.bottom);
    return { bins, x, h };
  }, [result]);

  if (!result || !fan || !fanGeom || !histGeom) {
    return (
      <div className="instrument">
        <p className="instrument__caveat">
          These correlations describe relationships that cannot all hold at once,
          so the simulation cannot run. Adjust the weights.
        </p>
      </div>
    );
  }

  const varValue = NOTIONAL - result.varMonteCarlo;
  const saved = result.undiversified - result.volatility;

  return (
    <div className="instrument">
      <Reveal className="instrument__head">
        <div>
          <span className="mono-label instrument__tag">
            Live data · closes to {market.assets[0]?.asOf}
          </span>
          <h3 className="instrument__title">What could this portfolio lose?</h3>
          <p className="instrument__sub">
            {formatCurrency(NOTIONAL)} spread across six real companies. Every
            volatility and every correlation below is measured from two years of
            their actual daily prices.
          </p>
        </div>
      </Reveal>

      {/* ---- what you own ---- */}
      <div className="holdings">
        <div className="holdings__head mono-label">
          <span>Company</span>
          <span>Price</span>
          <span>Swings by</span>
          <span>Your weight</span>
        </div>
        {market.assets.map((asset, i) => (
          <label className="holdings__row" key={asset.symbol}>
            <span className="holdings__name">
              <strong>{asset.symbol}</strong>
              <em>{asset.name}</em>
            </span>
            <span className="holdings__price">${asset.price.toFixed(2)}</span>
            <span className="holdings__vol">{formatPercent(asset.volatility, 0)}</span>
            <span className="holdings__weight">
              <input
                type="range"
                min={0}
                max={40}
                step={1}
                value={raw[i]}
                onChange={(e) => {
                  const next = [...raw];
                  next[i] = Number(e.target.value);
                  setRaw(next);
                }}
                aria-label={`Weight in ${asset.name}`}
                aria-valuetext={formatPercent(holdings[i].weight, 0)}
              />
              <output>{formatPercent(holdings[i].weight, 0)}</output>
            </span>
          </label>
        ))}
      </div>

      {/* ---- the diversification line ---- */}
      <div className="diversify">
        <p className="diversify__lead">
          These six do not move together. Over the last{' '}
          {market.correlationSessions} trading days the most closely linked pair
          moved in step about half the time, the least linked about a quarter.
          That is worth something, and here is exactly how much:
        </p>
        <div className="diversify__bars">
          <Bar
            label="If they all moved as one"
            value={result.undiversified}
            max={result.undiversified}
            tone="flat"
          />
          <Bar
            label="What they actually do"
            value={result.volatility}
            max={result.undiversified}
            tone="accent"
          />
        </div>
        <p className="diversify__saved">
          <strong>{formatPercent(saved, 1)}</strong> of annual swing removed for
          free — no forecast, no timing, no skill. Just owning things that do not
          all fall on the same day.
        </p>
      </div>

      {/* ---- horizon and confidence ---- */}
      <div className="instrument__controls">
        <Control
          label="Looking ahead"
          value={`${horizonDays} trading days`}
          min={5}
          max={252}
          step={1}
          current={horizonDays}
          onChange={(v) => setHorizonDays(Math.round(v))}
          hint="About 21 days to a month, 252 to a year."
        />
        <Control
          label="How bad a day"
          value={`worst ${formatPercent(alpha, 1)} of outcomes`}
          min={0.005}
          max={0.1}
          step={0.005}
          current={alpha}
          onChange={setAlpha}
          hint="1% asks about a rarer, worse day than 10% does."
        />
      </div>

      <figure className="instrument__figure">
        <figcaption className="mono-label">
          25,000 possible futures — the shaded bands hold the middle 90%, 60% and 30%
        </figcaption>
        <svg viewBox={`0 0 ${W} ${H}`} className="instrument__svg" role="img"
             aria-label="Fan chart of simulated portfolio values over the horizon">
          <line x1={PAD.left} y1={fanGeom.y(NOTIONAL)} x2={W - PAD.right}
                y2={fanGeom.y(NOTIONAL)} className="instrument__baseline" />
          {fan.bands.map((b, i) => (
            <path key={b.upper} d={fanGeom.bandPath(b)} className="instrument__band"
                  opacity={0.14 + i * 0.06} />
          ))}
          {fan.samples.map((walk, i) => (
            <path key={i} d={fanGeom.line(walk)} className="instrument__walk" />
          ))}
          <path d={fanGeom.line(fan.median)} className="instrument__median" />
          <text x={PAD.left - 10} y={fanGeom.y(NOTIONAL) + 4}
                className="instrument__axis" textAnchor="end">
            {formatCurrency(NOTIONAL)}
          </text>
          <text x={PAD.left} y={H - 8} className="instrument__axis">today</text>
          <text x={W - PAD.right} y={H - 8} className="instrument__axis" textAnchor="end">
            +{horizonDays}d
          </text>
        </svg>
      </figure>

      <figure className="instrument__figure">
        <figcaption className="mono-label">
          Where those futures end up — the dark tail is the worst {formatPercent(alpha, 1)}
        </figcaption>
        <svg viewBox={`0 0 ${W} ${H}`} className="instrument__svg" role="img"
             aria-label="Histogram of simulated final portfolio values, with the loss tail shaded">
          {histGeom.bins.map((b, i) => {
            const inTail = b.x1 <= varValue;
            const bx = histGeom.x(b.x0);
            const bw = Math.max(1, histGeom.x(b.x1) - bx - 1);
            const bh = histGeom.h(b.count);
            return (
              <rect key={i} x={bx} y={H - PAD.bottom - bh} width={bw} height={bh}
                    className={inTail ? 'instrument__bar instrument__bar--tail' : 'instrument__bar'} />
            );
          })}
          <line x1={histGeom.x(varValue)} y1={PAD.top} x2={histGeom.x(varValue)}
                y2={H - PAD.bottom} className="instrument__marker" />
          <text x={histGeom.x(varValue) + 6} y={PAD.top + 12}
                className="instrument__axis instrument__axis--accent">
            {formatCurrency(varValue)}
          </text>
          <line x1={histGeom.x(NOTIONAL)} y1={PAD.top} x2={histGeom.x(NOTIONAL)}
                y2={H - PAD.bottom} className="instrument__baseline" />
        </svg>
      </figure>

      {/* ---- the answer, in a sentence ---- */}
      <p className="instrument__plain">
        Over {horizonDays} trading days, this portfolio loses more than{' '}
        <strong>{formatCurrency(result.varMonteCarlo)}</strong> about{' '}
        {formatPercent(alpha, 1)} of the time — roughly one period in{' '}
        {Math.round(1 / alpha)}. When it does go that badly, the average loss is{' '}
        <strong>{formatCurrency(result.expectedShortfall)}</strong>.
      </p>

      <dl className="instrument__readout">
        <Readout label="Value at risk" value={formatCurrency(result.varMonteCarlo)}
                 note={`${formatPercent(1 - alpha, 0)} confidence`} strong />
        <Readout label="If it goes worse" value={formatCurrency(result.expectedShortfall)}
                 note="Average loss beyond that point" />
        <Readout label="Chance of any loss" value={formatPercent(result.probabilityOfLoss)}
                 note="Ends below where it started" />
        <Readout label="Middle outcome" value={formatCurrency(result.median)}
                 note="Half do better, half worse" />
        <Readout label="Portfolio swing" value={formatPercent(result.volatility)}
                 note="Annualised, after diversification" />
        <Readout label="Simulation vs formula" value={formatPercent(result.relativeError, 2)}
                 note="How far the two disagree" />
      </dl>

      <p className="instrument__caveat">
        <strong>What this assumes, and where it is wrong.</strong> Prices are
        modelled as drifting with steady randomness, and correlations are taken
        as fixed. Real markets do neither: calm and violent periods clump
        together, genuinely extreme days happen far more often than a bell curve
        allows, and — the one that matters most — correlations rise toward 1
        exactly when things are falling. The diversification above is real, and
        it is at its weakest on the days you would most want it. Treat every
        figure here as a demonstration of method, not as advice.
      </p>
      <p className="instrument__caveat instrument__caveat--quiet">
        The <em>simulation vs formula</em> line is not only sampling noise. The
        closed form treats the whole portfolio as one lognormal asset, which is
        an approximation — a weighted sum of lognormals is not itself lognormal.
        The simulation adds them up properly. So that number measures the
        approximation as well as the randomness, and it is shown rather than
        hidden.
      </p>
    </div>
  );
}

function Bar({
  label,
  value,
  max,
  tone,
}: {
  label: string;
  value: number;
  max: number;
  tone: 'flat' | 'accent';
}) {
  return (
    <div className={`diversify__bar diversify__bar--${tone}`}>
      <span className="mono-label">{label}</span>
      <span className="diversify__track">
        <span className="diversify__fill" style={{ width: `${(value / max) * 100}%` }} />
      </span>
      <output>{formatPercent(value, 1)}</output>
    </div>
  );
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
      <input type="range" min={min} max={max} step={step} value={current}
             onChange={(e) => onChange(Number(e.target.value))} aria-valuetext={value} />
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
