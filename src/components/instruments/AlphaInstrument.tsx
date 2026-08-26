'use client';

/**
 * The multi-factor desk.
 *
 * Five hundred and three companies ranked against each other every month on
 * seven measured exposures, the best of them sized by a mean-variance optimiser,
 * held for a month, and scored against what actually happened. Every control
 * below re-runs the whole backtest in the browser — the walk-forward loop, the
 * industry demeaning, the covariance and its inversion — on the real panel.
 *
 * ---
 *
 * WHY THE MARKET-NEUTRAL TOGGLE IS THE IMPORTANT CONTROL
 *
 * It is the one that shows the mistake. Built dollar-neutral — long the best
 * quintile, short the worst — this model LOST money over four years, and the
 * instinct is to blame the stock picking. It was not the stock picking: the long
 * book beat its universe by five and a half points a year the whole time. The
 * short book simply rose 28.7%, because in a rising market the worst-ranked
 * large caps still go up, and shorting them paid for the alpha twice over.
 *
 * Flip the toggle and the same seven factors, the same ranking and the same
 * optimiser turn into a model that works. Nothing about the prediction changed.
 * That is worth being able to do with a button rather than being told.
 *
 * ---
 *
 * WHY THE PANEL IS FETCHED AND NOT IMPORTED
 *
 * It is 1.5 MB of exposures — 516 KB gzipped, which is fine to download and not
 * fine to parse as JavaScript on every visit to this page. Importing it would
 * put it in the route's bundle whether or not anyone scrolls this far. Fetching
 * it when the instrument mounts keeps it out of the bundle entirely and costs
 * 17 ms of JSON.parse when it arrives.
 */

import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { runAlpha, ALPHA, type AlphaInput } from '@/lib/alpha';
import { asset } from '@/lib/asset';
import { Reveal } from '@/components/motion/Reveal';

const W = 760;
const H = 300;
const PAD = { top: 18, right: 16, bottom: 30, left: 62 };

type Panel = AlphaInput & { fetchedAt: string };

const pct = (v: number, places = 1) => `${(v * 100).toFixed(places)}%`;

/*
  Discrete controls, not sliders, and that is a measurement rather than a taste.

  One recompute is 423 ms on a desktop — the covariance inversion over a hundred
  names dominates it. A slider fires that on every pixel of drag and the whole
  page stops. Stepped choices fire it once per decision, which `useDeferredValue`
  then keeps off the paint path.
*/
const DECILES = [
  { label: 'Top 10%', value: 0.1 },
  { label: 'Top 20%', value: 0.2 },
  { label: 'Top 30%', value: 0.3 },
];

const TILTS = [
  { label: 'Off', value: 0 },
  { label: 'Normal', value: 1 },
  { label: 'Aggressive', value: 2 },
];

const CAPS = [
  { label: '3%', value: 0.03 },
  { label: '5%', value: 0.05 },
  { label: '10%', value: 0.1 },
];

const COSTS = [
  { label: 'None', value: 0 },
  { label: '10 bps', value: 10 },
  { label: '25 bps', value: 25 },
];

export function AlphaInstrument() {
  const [panel, setPanel] = useState<Panel | null>(null);
  const [failed, setFailed] = useState(false);

  const [neutral, setNeutral] = useState(false);
  const [decile, setDecile] = useState(0.2);
  const [tilt, setTilt] = useState(1);
  const [cap, setCap] = useState(0.05);
  const [cost, setCost] = useState(10);

  useEffect(() => {
    let live = true;
    fetch(asset('/data/alpha.json'))
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((d) => {
        if (!live) return;
        setPanel({
          fetchedAt: d.fetchedAt,
          symbols: d.universe.map((u: { symbol: string }) => u.symbol),
          industries: d.universe.map((u: { industry: string }) => u.industry),
          monthEnds: d.monthEnds,
          closes: d.closes,
          months: d.months,
        });
      })
      .catch(() => live && setFailed(true));
    return () => {
      live = false;
    };
  }, []);

  /*
    Deferred as primitives, never as an options object. `useDeferredValue` on an
    inline object is an infinite render loop — a fresh identity every render
    means the deferred pass never matches the one that scheduled it. The risk
    desk carries the same note for the same reason.
  */
  const dNeutral = useDeferredValue(neutral);
  const dDecile = useDeferredValue(decile);
  const dTilt = useDeferredValue(tilt);
  const dCap = useDeferredValue(cap);
  const dCost = useDeferredValue(cost);

  const result = useMemo(() => {
    if (!panel) return null;
    return runAlpha(panel, {
      ...ALPHA,
      decile: dDecile,
      tilt: dTilt,
      maxWeight: dCap,
      costBps: dCost,
      /*
        Dollar-neutral is net 0 against gross 2 — a hundred percent long and a
        hundred percent short. Long-only is net 1 against gross 1, and the
        optimiser reads that equality as the instruction to clip shorts away.
      */
      gross: dNeutral ? 2 : 1,
      net: dNeutral ? 0 : 1,
    });
  }, [panel, dNeutral, dDecile, dTilt, dCap, dCost]);

  /*
    Two benchmarks, over EXACTLY the months the model held.

    The month matching is not a detail — getting it wrong is what hid this
    model's real performance for a whole build. The model needs thirteen months
    of history before it can form a first portfolio, so it trades 47 of the 60
    months in the panel, and the thirteen it skips are the 2022 bear market.
    Scoring it against a benchmark that had eaten that crash flattered it by
    nine points a year and turned a losing model into a winning one on paper.

    The second benchmark is the harder one and the one that matters. The model
    runs at a beta near 0.77, so the control is not the whole index — it is that
    fraction of the index with the rest in cash, which carries the same market
    exposure and is free. Anything the model is worth has to show up against
    THAT, because a lower return at a lower risk is not a discovery, it is a
    smaller position.
  */
  const benchmark = useMemo(() => {
    if (!panel || !result) return null;
    const index = new Map(panel.monthEnds.map((d, i) => [d, i]));

    const moves: number[] = [];
    for (const month of result.months) {
      const i = index.get(month.held);
      const step: number[] = [];
      if (i !== undefined && i > 0) {
        for (const symbol of panel.symbols) {
          const a = panel.closes[symbol]?.[i - 1];
          const b = panel.closes[symbol]?.[i];
          if (a != null && b != null && a > 0) step.push(b / a - 1);
        }
      }
      moves.push(step.length ? step.reduce((s, v) => s + v, 0) / step.length : 0);
    }

    const beta = result.months.reduce((s, m) => s + m.netBeta, 0) / result.months.length;
    const years = result.months.length / 12;
    const grow = (rs: number[]) => {
      const curve = [1];
      for (const r of rs) curve.push(curve[curve.length - 1] * (1 + r));
      return curve;
    };
    const ann = (curve: number[]) =>
      years > 0 ? curve[curve.length - 1] ** (1 / years) - 1 : 0;

    const index100 = grow(moves);
    const matched = grow(moves.map((r) => r * beta));

    return {
      beta,
      curve: index100,
      annualised: ann(index100),
      matchedCurve: matched,
      matchedAnnualised: ann(matched),
    };
  }, [panel, result]);

  const geometry = useMemo(() => {
    if (!result || !benchmark) return null;
    const all = [...result.curve, ...benchmark.curve, ...benchmark.matchedCurve];
    const lo = Math.min(...all);
    const hi = Math.max(...all);
    const n = result.curve.length - 1 || 1;
    const x = (i: number) => PAD.left + (i / n) * (W - PAD.left - PAD.right);
    const y = (v: number) =>
      PAD.top + (1 - (v - lo) / (hi - lo || 1)) * (H - PAD.top - PAD.bottom);
    const line = (vals: number[]) =>
      vals.map((v, i) => `${i === 0 ? 'M' : 'L'} ${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(' ');

    // Four gridlines at round multiples of the starting capital.
    const ticks: number[] = [];
    const step = (hi - lo) / 4;
    for (let k = 0; k <= 4; k++) ticks.push(lo + step * k);

    return { x, y, line, ticks, lo, hi };
  }, [result, benchmark]);

  /* What the book is actually made of, by industry bucket, right now. */
  const exposure = useMemo(() => {
    if (!panel || !result) return [];
    const last = result.months.at(-1);
    if (!last) return [];
    const sector = new Map(panel.symbols.map((s, i) => [s, panel.industries[i]]));
    const totals = new Map<string, number>();
    for (const h of last.longs) {
      const key = sector.get(h.symbol) ?? 'Unclassified';
      totals.set(key, (totals.get(key) ?? 0) + h.weight);
    }
    return [...totals.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [panel, result]);

  if (failed) {
    return (
      <div className="instrument">
        <p className="instrument__caveat">
          The factor panel could not be loaded, so the backtest cannot run.
        </p>
      </div>
    );
  }

  if (!panel || !result || !benchmark || !geometry) {
    return (
      <div className="instrument">
        <p className="instrument__note">Loading five years of exposures…</p>
      </div>
    );
  }

  const last = result.months.at(-1);
  const edge = result.metrics.annualised - benchmark.matchedAnnualised;
  const asOf = panel.monthEnds.at(-1) ?? '';

  return (
    <div className="instrument">
      <Reveal className="instrument__head">
        <div>
          <span className="mono-label instrument__tag">
            Live data · S&amp;P 500 · closes to {asOf}
          </span>
          <h3 className="instrument__title">Can seven measurements rank 503 companies?</h3>
          <p className="instrument__sub">
            Every month the model scores every company on momentum, reversal,
            volatility, downside risk, beta, idiosyncratic risk and illiquidity —
            each measured against its own industry, never the market — then sizes
            the best of them by mean-variance and holds for a month. Nothing is
            fitted: the factor directions come from the published literature and
            the weights are equal.
          </p>
        </div>
      </Reveal>

      <div className="instrument__controls alpha__controls">
        <label className="instrument__control alpha__toggle">
          <span className="mono-label">Construction</span>
          <button
            type="button"
            className={`alpha__switch${neutral ? ' is-neutral' : ''}`}
            onClick={() => setNeutral((v) => !v)}
            aria-pressed={neutral}
          >
            <span>Long only</span>
            <span>Market neutral</span>
          </button>
        </label>

        <Choice label="How many it buys" options={DECILES} value={decile} onChange={setDecile} />
        <Choice label="Risk model" options={TILTS} value={tilt} onChange={setTilt} />
        <Choice label="Position cap" options={CAPS} value={cap} onChange={setCap} />
        <Choice label="Trading cost" options={COSTS} value={cost} onChange={setCost} />
      </div>

      <figure className="instrument__figure">
        <svg
          className="instrument__svg"
          viewBox={`0 0 ${W} ${H}`}
          role="img"
          aria-label={`Growth of one dollar: the model versus an equal-weighted S&P 500, over ${result.months.length} months`}
        >
          {geometry.ticks.map((t) => (
            <g key={t}>
              <line
                className="alpha__grid"
                x1={PAD.left}
                x2={W - PAD.right}
                y1={geometry.y(t)}
                y2={geometry.y(t)}
              />
              <text className="instrument__axis" x={PAD.left - 8} y={geometry.y(t) + 4} textAnchor="end">
                {t.toFixed(2)}×
              </text>
            </g>
          ))}

          <path className="alpha__benchmark" d={geometry.line(benchmark.curve)} />
          <path className="alpha__matched" d={geometry.line(benchmark.matchedCurve)} />
          <path className="alpha__curve" d={geometry.line(result.curve)} />

          <text className="instrument__axis" x={PAD.left} y={H - 8}>
            {result.months[0]?.held ?? ''}
          </text>
          <text className="instrument__axis" x={W - PAD.right} y={H - 8} textAnchor="end">
            {result.months.at(-1)?.held ?? ''}
          </text>
        </svg>
        <figcaption>
          Growth of one dollar after costs. <span className="alpha__key alpha__key--model" />{' '}
          the model · <span className="alpha__key alpha__key--bench" /> an equal-weighted
          S&amp;P 500 · <span className="alpha__key alpha__key--matched" /> that same index
          held at {(benchmark.beta * 100).toFixed(0)}% of full size, the rest in cash — the
          market exposure the model actually runs, available to anyone for nothing. Only the
          gap between the model and <em>that</em> line is the model&rsquo;s own work, and
          right now it is on the wrong side of it.
        </figcaption>
      </figure>

      <dl className="instrument__readout">
        <div className={`instrument__cell${edge > 0 ? ' is-strong' : ''}`}>
          <dt>The model&rsquo;s own edge</dt>
          <dd className="instrument__value">
            {edge >= 0 ? '+' : ''}
            {pct(edge)}
          </dd>
        </div>
        <div className="instrument__cell">
          <dt>Model, a year</dt>
          <dd className="instrument__value">{pct(result.metrics.annualised)}</dd>
        </div>
        <div className="instrument__cell">
          <dt>Same exposure, passive</dt>
          <dd className="instrument__value">{pct(benchmark.matchedAnnualised)}</dd>
        </div>
        <div className="instrument__cell">
          <dt>Whole index, a year</dt>
          <dd className="instrument__value">{pct(benchmark.annualised)}</dd>
        </div>
        <div className="instrument__cell">
          <dt>Return per unit of risk</dt>
          <dd className="instrument__value">{result.metrics.sharpe.toFixed(2)}</dd>
        </div>
        <div className="instrument__cell">
          <dt>Worst fall</dt>
          <dd className="instrument__value">−{pct(result.metrics.maxDrawdown)}</dd>
        </div>
        <div className="instrument__cell">
          <dt>Months up</dt>
          <dd className="instrument__value">{pct(result.metrics.hitRate, 0)}</dd>
        </div>
        <div className="instrument__cell">
          <dt>Book replaced monthly</dt>
          <dd className="instrument__value">{pct(result.metrics.averageTurnover, 0)}</dd>
        </div>
        <div className="instrument__cell">
          <dt>Market exposure</dt>
          <dd className="instrument__value">
            {(result.months.reduce((s, m) => s + m.netBeta, 0) / result.months.length).toFixed(2)}
          </dd>
        </div>
      </dl>

      <p className="instrument__note">
        {neutral ? (
          <>
            Dollar neutral: every pound long is matched by a pound short, so the
            market cancels and only the ranking survives. It is the textbook
            construction and it is catastrophic here — shorting the worst-ranked
            large caps in a rising market means shorting things that still went up.
          </>
        ) : (
          <>
            Long only: it buys the top {Math.round(decile * 100)}% and holds nothing
            short. <strong>It still does not beat simply holding{' '}
            {(benchmark.beta * 100).toFixed(0)}% of the index.</strong> Of the six
            directional factors only momentum earns anything; the three low-risk
            ones cost about seven points a year each in a bull market, and equal
            weighting lets four losers outvote two winners. Weighting momentum
            higher would fix the backtest and prove nothing — that is fitting the
            answer to the sample, which is the one thing this model refuses to do.
          </>
        )}
      </p>

      {last && (
        <div className="alpha__book">
          <div className="alpha__column">
            <h4 className="mono-label">
              Largest positions · formed {last.formed}
            </h4>
            <ul className="alpha__list">
              {last.longs.slice(0, 8).map((h) => (
                <li key={h.symbol}>
                  <span className="alpha__symbol">{h.symbol}</span>
                  <span className="alpha__bar" aria-hidden>
                    <span style={{ width: `${Math.min(100, (h.weight / cap) * 100)}%` }} />
                  </span>
                  <span className="alpha__weight">{pct(h.weight)}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="alpha__column">
            <h4 className="mono-label">Where the money sits</h4>
            <ul className="alpha__list">
              {exposure.map(([sector, weight]) => (
                <li key={sector}>
                  <span className="alpha__symbol alpha__symbol--wide">{sector}</span>
                  <span className="alpha__bar" aria-hidden>
                    <span style={{ width: `${Math.min(100, weight * 400)}%` }} />
                  </span>
                  <span className="alpha__weight">{pct(weight)}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <p className="instrument__caveat">
        These are the companies in the index <em>today</em>. Everything that was
        in it five years ago and then failed, was acquired or was dropped is
        missing, which flatters the result by an unknown amount. The honest fix is
        point-in-time membership, and it is not available: prices for delisted
        companies are gone — SIVB, FRC, ATVI, XLNX, TWTR, CERN, ANSS and NLOK all
        return 404. Rebuilding the index without them would look rigorous while
        still dropping every failure, so the bias is disclosed instead of hidden.
      </p>
    </div>
  );
}

function Choice<T extends number>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly { label: string; value: T }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="instrument__control alpha__choice">
      <span className="mono-label">{label}</span>
      <div className="alpha__segments" role="group" aria-label={label}>
        {options.map((o) => (
          <button
            key={o.label}
            type="button"
            className={`alpha__segment${o.value === value ? ' is-on' : ''}`}
            onClick={() => onChange(o.value)}
            aria-pressed={o.value === value}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}
