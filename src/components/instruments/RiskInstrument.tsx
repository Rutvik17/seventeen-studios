'use client';

/**
 * A working value-at-risk desk.
 *
 * Move a control and every figure recomputes from a fresh Monte Carlo in the
 * visitor's own browser. Nothing here is recorded, pre-rendered or read from a
 * fixture — the maths is `lib/quant.ts` and the numbers below are whatever it
 * returned this frame.
 *
 * ---
 *
 * WHY THE ANALYTIC COLUMN IS ON SCREEN
 *
 * It is the part a knowledgeable reader will check first, and that is the
 * intent. Under geometric Brownian motion the terminal log-return is normal, so
 * VaR has a closed form; the panel runs the simulation and the closed form side
 * by side and prints the disagreement between them. A simulation that lands
 * within a fraction of a percent of theory is a verifiable claim about whether
 * the people who built this know what they are doing — which is the job this
 * section is doing on a site with no client list yet.
 *
 * It is also a live regression test. Drop the Itô correction from the drift and
 * the error column goes visibly wrong long before the chart looks odd.
 *
 * ---
 *
 * THE MODEL'S LIMITS ARE PRINTED TOO
 *
 * GBM has thin tails and constant volatility, and real markets have neither.
 * Saying so on the panel costs nothing and is the difference between a
 * demonstration and a claim — anyone who would be impressed by this instrument
 * knows its assumptions, and pretending otherwise would lose exactly the reader
 * it is meant to reach.
 */

import { useDeferredValue, useMemo, useState } from 'react';
import {
  formatCurrency,
  formatPercent,
  simulateFan,
  simulateRisk,
} from '@/lib/quant';
import { Reveal } from '@/components/motion/Reveal';

const NOTIONAL = 1_000_000;
const PATHS = 25_000;

const W = 760;
const H = 260;
const PAD = { top: 18, right: 16, bottom: 30, left: 68 };

export function RiskInstrument() {
  const [volatility, setVolatility] = useState(0.18);
  const [horizonDays, setHorizonDays] = useState(63);
  const [alpha, setAlpha] = useState(0.05);
  const [drift, setDrift] = useState(0.07);

  /*
    Deferred so dragging a slider keeps painting at full rate: React commits the
    control immediately and recomputes the 25k-path simulation at lower
    priority. Without it the drag stutters on a mid-range laptop.

    Four separate primitives, NOT one deferred object — and that is not a style
    preference. `useDeferredValue({ ... })` on an inline literal is an infinite
    render loop: the object has a new identity on every render, so the deferred
    render passes a value that differs from the one that scheduled it, which
    schedules another, forever. React's own documentation is explicit that the
    argument must be a primitive or something created outside of rendering.
  */
  const dVolatility = useDeferredValue(volatility);
  const dHorizon = useDeferredValue(horizonDays);
  const dAlpha = useDeferredValue(alpha);
  const dDrift = useDeferredValue(drift);

  const result = useMemo(
    () =>
      simulateRisk({
        notional: NOTIONAL,
        drift: dDrift,
        volatility: dVolatility,
        horizonDays: dHorizon,
        alpha: dAlpha,
        paths: PATHS,
        seed: 20260821,
      }),
    [dDrift, dVolatility, dHorizon, dAlpha],
  );

  const fan = useMemo(
    () =>
      simulateFan({
        notional: NOTIONAL,
        drift: dDrift,
        volatility: dVolatility,
        horizonDays: dHorizon,
        seed: 20260821,
      }),
    [dDrift, dVolatility, dHorizon],
  );

  /* ---- fan chart geometry ------------------------------------------ */
  const fanGeom = useMemo(() => {
    const all = fan.bands.flatMap((b) => [...b.hi, ...b.lo]);
    const lo = Math.min(...all);
    const hi = Math.max(...all);
    const x = (i: number) =>
      PAD.left + (i / fan.steps) * (W - PAD.left - PAD.right);
    const y = (v: number) =>
      PAD.top + (1 - (v - lo) / (hi - lo || 1)) * (H - PAD.top - PAD.bottom);

    const bandPath = (b: (typeof fan.bands)[number]) => {
      const up = b.hi.map((v, i) => `${i === 0 ? 'M' : 'L'} ${x(i).toFixed(1)} ${y(v).toFixed(1)}`);
      const down = b.lo
        .map((v, i) => ({ v, i }))
        .reverse()
        .map(({ v, i }) => `L ${x(i).toFixed(1)} ${y(v).toFixed(1)}`);
      return `${up.join(' ')} ${down.join(' ')} Z`;
    };

    const line = (vals: number[]) =>
      vals.map((v, i) => `${i === 0 ? 'M' : 'L'} ${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(' ');

    return { lo, hi, x, y, bandPath, line };
  }, [fan]);

  /* ---- histogram geometry ------------------------------------------ */
  const histGeom = useMemo(() => {
    const bins = result.histogram;
    const maxCount = Math.max(...bins.map((b) => b.count)) || 1;
    const lo = bins[0].x0;
    const hi = bins[bins.length - 1].x1;
    const x = (v: number) =>
      PAD.left + ((v - lo) / (hi - lo || 1)) * (W - PAD.left - PAD.right);
    const h = (c: number) => (c / maxCount) * (H - PAD.top - PAD.bottom);
    return { bins, lo, hi, x, h };
  }, [result]);

  const varValue = NOTIONAL - result.varMonteCarlo;

  return (
    <div className="instrument">
      <Reveal className="instrument__head">
        <div>
          <span className="mono-label instrument__tag">Live · Monte Carlo</span>
          <h3 className="instrument__title">Portfolio value at risk</h3>
          <p className="instrument__sub">
            {PATHS.toLocaleString('en-CA')} simulated outcomes on a{' '}
            {formatCurrency(NOTIONAL)} book, redrawn on every change.
          </p>
        </div>
      </Reveal>

      <div className="instrument__controls">
        <Control
          label="Annualised volatility"
          value={formatPercent(volatility)}
          min={0.04}
          max={0.6}
          step={0.005}
          current={volatility}
          onChange={setVolatility}
        />
        <Control
          label="Expected return"
          value={formatPercent(drift)}
          min={-0.1}
          max={0.25}
          step={0.005}
          current={drift}
          onChange={setDrift}
        />
        <Control
          label="Horizon"
          value={`${horizonDays} trading days`}
          min={5}
          max={252}
          step={1}
          current={horizonDays}
          onChange={(v) => setHorizonDays(Math.round(v))}
        />
        <Control
          label="Confidence"
          value={formatPercent(1 - alpha, 0)}
          min={0.005}
          max={0.1}
          step={0.005}
          current={alpha}
          onChange={setAlpha}
          invert
        />
      </div>

      {/* ---- fan chart ---- */}
      <figure className="instrument__figure">
        <figcaption className="mono-label">
          Simulated paths — 5th to 95th percentile bands
        </figcaption>
        <svg viewBox={`0 0 ${W} ${H}`} className="instrument__svg" role="img"
             aria-label="Fan chart of simulated portfolio paths over the horizon">
          <line
            x1={PAD.left} y1={fanGeom.y(NOTIONAL)}
            x2={W - PAD.right} y2={fanGeom.y(NOTIONAL)}
            className="instrument__baseline"
          />
          {fan.bands.map((b, i) => (
            <path
              key={b.upper}
              d={fanGeom.bandPath(b)}
              className="instrument__band"
              /* Nested bands, so opacity compounds toward the middle and the
                 densest region reads darkest — the same way a real fan chart
                 shows where the mass is. */
              opacity={0.14 + i * 0.06}
            />
          ))}
          {fan.samples.map((walk, i) => (
            <path key={i} d={fanGeom.line(walk)} className="instrument__walk" />
          ))}
          <path d={fanGeom.line(fan.median)} className="instrument__median" />
          <text x={PAD.left - 10} y={fanGeom.y(NOTIONAL) + 4} className="instrument__axis" textAnchor="end">
            {formatCurrency(NOTIONAL)}
          </text>
          <text x={PAD.left} y={H - 8} className="instrument__axis">today</text>
          <text x={W - PAD.right} y={H - 8} className="instrument__axis" textAnchor="end">
            +{horizonDays}d
          </text>
        </svg>
      </figure>

      {/* ---- terminal distribution ---- */}
      <figure className="instrument__figure">
        <figcaption className="mono-label">
          Distribution of outcomes at the horizon — shaded region is the {formatPercent(alpha, 1)} tail
        </figcaption>
        <svg viewBox={`0 0 ${W} ${H}`} className="instrument__svg" role="img"
             aria-label="Histogram of simulated terminal portfolio values with the loss tail shaded">
          {histGeom.bins.map((b, i) => {
            const inTail = b.x1 <= varValue;
            const bx = histGeom.x(b.x0);
            const bw = Math.max(1, histGeom.x(b.x1) - bx - 1);
            const bh = histGeom.h(b.count);
            return (
              <rect
                key={i}
                x={bx}
                y={H - PAD.bottom - bh}
                width={bw}
                height={bh}
                className={inTail ? 'instrument__bar instrument__bar--tail' : 'instrument__bar'}
              />
            );
          })}
          <line
            x1={histGeom.x(varValue)} y1={PAD.top}
            x2={histGeom.x(varValue)} y2={H - PAD.bottom}
            className="instrument__marker"
          />
          <text
            x={histGeom.x(varValue) + 6} y={PAD.top + 12}
            className="instrument__axis instrument__axis--accent"
          >
            VaR
          </text>
          <line
            x1={histGeom.x(NOTIONAL)} y1={PAD.top}
            x2={histGeom.x(NOTIONAL)} y2={H - PAD.bottom}
            className="instrument__baseline"
          />
        </svg>
      </figure>

      {/* ---- readouts ---- */}
      <dl className="instrument__readout">
        <Readout
          label={`VaR — simulated`}
          value={formatCurrency(result.varMonteCarlo)}
          note={`${formatPercent(1 - alpha, 0)} confidence, ${horizonDays}d`}
          strong
        />
        <Readout
          label="VaR — closed form"
          value={formatCurrency(result.varAnalytic)}
          note="Exact under this model"
        />
        <Readout
          label="Disagreement"
          value={formatPercent(result.relativeError, 3)}
          note="Simulation against theory"
        />
        <Readout
          label="Expected shortfall"
          value={formatCurrency(result.expectedShortfall)}
          note="Mean loss beyond VaR"
        />
        <Readout
          label="Probability of loss"
          value={formatPercent(result.probabilityOfLoss)}
          note="Ends below today’s value"
        />
        <Readout
          label="Median outcome"
          value={formatCurrency(result.median)}
          note="50th percentile"
        />
      </dl>

      <p className="instrument__caveat">
        <strong>What this model assumes.</strong> Geometric Brownian motion:
        constant volatility and normally distributed log-returns. Real markets
        have neither — returns are fat-tailed and volatility clusters, so a true
        1-in-20 day is worse than this shows. The instrument is here to
        demonstrate method, not to price a book. The correction is a
        Student-<em>t</em> or a historical bootstrap in place of the normal
        draw, which is a change to one function.
      </p>
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
  invert,
}: {
  label: string;
  value: string;
  min: number;
  max: number;
  step: number;
  current: number;
  onChange: (v: number) => void;
  invert?: boolean;
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
        /* The slider reports its own value to a screen reader as the formatted
           string, not as the raw decimal — "95%" rather than "0.05", which is
           the number nobody was looking at. */
        aria-valuetext={value}
        style={invert ? { direction: 'rtl' } : undefined}
      />
      <output>{value}</output>
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
