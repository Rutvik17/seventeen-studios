'use client';

/**
 * THE BOOK — the model's account.
 *
 * Presented the way a brokerage presents one, because that is what it is: a
 * balance, what it grew from, what is held right now, and what was traded to
 * get there. A strategy shown as an "instrument" invites a reader to grade the
 * method. Shown as an account it invites the only question that matters, which
 * is what it is worth and what is in it.
 *
 * Everything here is a $10,000 stake compounded through the backtest. It is a
 * simulation and it says so once, plainly, rather than hedging in every
 * paragraph.
 */

import { useEffect, useMemo, useState } from 'react';
import { asset } from '@/lib/asset';
import survivorship from '@/content/survivorship.json';

type Metrics = { total: number; annual: number; vol: number; sharpe: number; maxDrawdown: number };

type Book = {
  start: string;
  end: string;
  tradingDays: number;
  sampleStride: number;
  stake: number;
  finalValue: number;
  finalSpyValue: number;
  dates: string[];
  curve: number[];
  spy: number[];
  drawdown: { curve: number[]; spy: number[] };
  metrics: { strategy: Metrics; spy: Metrics };
  pointInTime?: boolean;
  biased?: { finalValue: number; annual: number; sharpe: number } | null;
  byYear: Array<{ year: string; strategy: number; spy: number; excess: number; value: number; spyValue: number }>;
  currentBook: {
    date: string;
    exposure: number;
    gross: number;
    net: number;
    positions: Array<{ symbol: string; weight: number; entry: number | null; price: number; since: string; ret: number | null }>;
  };
  closed?: Array<{ symbol: string; opened: string; closed: string; entry: number; exit: number; ret: number; value: number }>;
  closedStats?: { count: number; winners: number; winRate: number; bestPct: number; worstPct: number } | null;
  byYearHoldings: Array<{ year: string; distinct: number; top: Array<{ symbol: string; weight: number }> }>;
  persistent: Array<{ symbol: string; years: number }>;
  rebalances: Array<{ date: string; exposure: number; reason: string; longs: number; shorts: number; net: number; turnover: number }>;
};

/*
  Live first, baked second.

  The build carries a copy so the page works offline and on first paint; if a
  newer one has been published to the data branch, that wins. Same shape as the
  live quote on the board — raw GitHub sends CORS headers and caches for five
  minutes, so the account refreshes on a rebalance without a deploy.
*/
const LIVE = 'https://raw.githubusercontent.com/Rutvik17/seventeen-studios/data/engine.json';

const RANGES = [
  { label: '1Y', years: 1 },
  { label: '5Y', years: 5 },
  { label: '10Y', years: 10 },
  { label: 'All', years: Infinity },
] as const;

const W = 800;
const H = 260;
const PAD = { top: 14, right: 12, bottom: 24, left: 58 };

const money = (v: number) =>
  v.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const pct = (v: number) => `${v >= 0 ? '+' : ''}${(v * 100).toFixed(2)}%`;
const pct1 = (v: number) => `${v >= 0 ? '+' : ''}${(v * 100).toFixed(1)}%`;

export function BookAccount() {
  const [data, setData] = useState<Book | null>(null);
  const [failed, setFailed] = useState(false);
  const [range, setRange] = useState<string>('All');
  const [live, setLive] = useState(false);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      // The baked copy is the floor: if the live one is missing or malformed the
      // page still renders a complete account rather than an error.
      try {
        const res = await fetch(asset('/data/engine.json'));
        if (res.ok && alive) setData(await res.json());
      } catch {
        if (alive) setFailed(true);
      }
      try {
        const res = await fetch(LIVE, { cache: 'no-store' });
        if (!res.ok) return;
        const fresh: Book = await res.json();
        if (alive && fresh?.currentBook?.positions?.length) {
          setData(fresh);
          setLive(true);
        }
      } catch {
        // No live copy published yet. The baked one is already showing.
      }
    };
    load();
    const timer = setInterval(load, 5 * 60 * 1000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, []);

  const view = useMemo(() => {
    if (!data) return null;
    const years = RANGES.find((r) => r.label === range)?.years ?? Infinity;
    let from = 0;
    if (Number.isFinite(years)) {
      const cutoff = new Date(data.dates[data.dates.length - 1]);
      cutoff.setFullYear(cutoff.getFullYear() - (years as number));
      const iso = cutoff.toISOString().slice(0, 10);
      from = Math.max(0, data.dates.findIndex((d) => d >= iso));
    }

    const dates = data.dates.slice(from);
    /*
      Rebased to the start of the window, so a five-year view answers "what did
      five years do" rather than showing the tail of a fourteen-year multiple.
      A range selector that does not rebase is comparing to a moment nobody is
      looking at.
    */
    const base = data.curve[from];
    const spyBase = data.spy[from];
    const curve = data.curve.slice(from).map((v) => v / base);
    const spy = data.spy.slice(from).map((v) => v / spyBase);

    const all = [...curve, ...spy];
    const lo = Math.min(...all);
    const hi = Math.max(...all);
    const x = (i: number) => PAD.left + (i / (dates.length - 1)) * (W - PAD.left - PAD.right);
    const y = (v: number) =>
      PAD.top + (1 - (v - lo) / (hi - lo || 1)) * (H - PAD.top - PAD.bottom);

    const ticks = [lo, lo + (hi - lo) / 2, hi];
    return { dates, curve, spy, x, y, ticks, stake: data.stake };
  }, [data, range]);

  if (failed && !data) {
    return <p className="book__empty">The account did not load.</p>;
  }
  if (!data || !view) {
    return <p className="book__empty">Opening the account…</p>;
  }

  const gain = data.finalValue - data.stake;
  const gainPct = data.finalValue / data.stake - 1;
  const line = (values: number[]) =>
    values.map((v, i) => `${i ? 'L' : 'M'} ${view.x(i).toFixed(1)} ${view.y(v).toFixed(1)}`).join(' ');

  const measured = survivorship.measured;
  const icDrop = Math.abs(Math.round(measured.change * 100));

  return (
    <div className="book">
      <header className="book__summary">
        <p className="mono-label">Total value</p>
        <p className="book__total">{money(data.finalValue)}</p>
        <p className="book__delta" data-sign={gain >= 0 ? 'up' : 'down'}>
          {gain >= 0 ? '▲' : '▼'} {money(Math.abs(gain))} ({pct(gainPct)}) since {data.start.slice(0, 4)}
        </p>
        <p className="book__against">
          The same {money(data.stake)} in SPY: <strong>{money(data.finalSpyValue)}</strong>
        </p>
        {data.biased ? (
          <p className="book__against">
            Allowed to buy companies before they joined the index, the same model
            claimed <strong>{money(data.biased.finalValue)}</strong>. That gap is
            survivorship bias, priced.
          </p>
        ) : null}
      </header>

      <div className="book__ranges" role="group" aria-label="Chart range">
        {RANGES.map((r) => (
          <button
            key={r.label}
            type="button"
            className="book__range"
            aria-pressed={range === r.label}
            onClick={() => setRange(r.label)}
          >
            {r.label}
          </button>
        ))}
      </div>

      <figure className="book__chart">
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`The book against SPY, ${view.dates[0]} to ${view.dates[view.dates.length - 1]}`}>
          {view.ticks.map((t, i) => (
            <g key={i}>
              <line className="book__grid" x1={PAD.left} x2={W - PAD.right} y1={view.y(t)} y2={view.y(t)} />
              <text className="book__tick" x={PAD.left - 8} y={view.y(t) + 4} textAnchor="end">
                {money(t * view.stake)}
              </text>
            </g>
          ))}
          <path className="book__line book__line--spy" d={line(view.spy)} />
          <path className="book__line book__line--book" d={line(view.curve)} />
          <text className="book__tick" x={PAD.left} y={H - 6}>{view.dates[0]}</text>
          <text className="book__tick" x={W - PAD.right} y={H - 6} textAnchor="end">
            {view.dates[view.dates.length - 1]}
          </text>
        </svg>
        <figcaption className="book__legend">
          <span className="book__key book__key--book">The book</span>
          <span className="book__key book__key--spy">SPY</span>
          <span className="book__legend-note">
            Rebased to the start of the range · plotted every {data.sampleStride}th day,
            measured on all {data.tradingDays.toLocaleString()}
          </span>
        </figcaption>
      </figure>

      <section className="book__section">
        <h2 className="book__heading">
          Holdings <span className="book__count">{data.currentBook.positions.length}</span>
        </h2>
        <p className="book__meta">
          As at {data.currentBook.date} · bought &rarr; now, and the return on each ·
          largest position {(Math.abs(data.currentBook.positions[0].weight) * 100).toFixed(2)}% of
          the account{live ? ' · live' : ''}
        </p>
        {/*
          `data-lenis-prevent` or this does not scroll. Lenis drives the page
          with its own wheel handler, and without this attribute it swallows the
          event and the list underneath never sees it — the same reason the menu
          overlay carries one.
        */}
        <ol className="book__holdings" data-lenis-prevent>
          {data.currentBook.positions.map((p) => (
            <li key={p.symbol}>
              <span className="book__symbol">{p.symbol}</span>
              <span className="book__basis">
                {p.entry ? `$${p.entry.toFixed(2)}` : '—'}
                <em>&rarr;</em>
                ${p.price.toFixed(2)}
              </span>
              <span className="book__ret" data-sign={(p.ret ?? 0) >= 0 ? 'up' : 'down'}>
                {p.ret === null ? '' : pct1(p.ret)}
              </span>
              {/*
                The bar is the position's share of the WHOLE ACCOUNT, so the
                track is 100%. It was scaled to the largest holding, which made
                a near-equal-weight book look like it had a hierarchy: every bar
                sat between 91% and 100% of the one above it and the picture
                said "concentrated" where the numbers said the opposite.

                Against the account the bars are short, and that is the finding:
                97 names and nothing over 2.5%.
              */}
              <span className="book__bar" aria-hidden>
                <i style={{ width: `${Math.min(100, Math.abs(p.weight) * 100)}%` }} />
              </span>
              <span className="book__weight">{(p.weight * 100).toFixed(2)}%</span>
              <span className="book__value">{money(p.weight * data.finalValue)}</span>
            </li>
          ))}
        </ol>
      </section>

      <section className="book__section">
        <h2 className="book__heading">By year</h2>
        <table className="book__table">
          <thead>
            <tr>
              <th scope="col">Year</th>
              <th scope="col">Return</th>
              <th scope="col">Value</th>
              <th scope="col">SPY</th>
              <th scope="col">Excess</th>
            </tr>
          </thead>
          <tbody>
            {data.byYear.map((y) => (
              <tr key={y.year}>
                <th scope="row">{y.year}</th>
                <td data-sign={y.strategy >= 0 ? 'up' : 'down'}>{pct1(y.strategy)}</td>
                <td className="book__strong">{money(y.value)}</td>
                <td>{money(y.spyValue)}</td>
                <td data-sign={y.excess >= 0 ? 'up' : 'down'}>{pct1(y.excess)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="book__section">
        <h2 className="book__heading">Largest position each year</h2>
        <table className="book__table book__table--wide">
          <thead>
            <tr>
              <th scope="col">Year</th>
              <th scope="col">Names</th>
              <th scope="col">Top ten by average weight</th>
            </tr>
          </thead>
          <tbody>
            {data.byYearHoldings.map((y) => (
              <tr key={y.year}>
                <th scope="row">{y.year}</th>
                <td>{y.distinct}</td>
                <td className="book__tickers">
                  {y.top.map((t) => (
                    <span key={t.symbol}>
                      {t.symbol}<em>{(t.weight * 100).toFixed(1)}</em>
                    </span>
                  ))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {data.closed?.length ? (
        <section className="book__section">
          <h2 className="book__heading">
            Closed <span className="book__count">{data.closedStats?.count.toLocaleString()}</span>
          </h2>
          <p className="book__meta">
            {data.closedStats
              ? `${(data.closedStats.winRate * 100).toFixed(0)}% closed above their entry · best ${pct1(data.closedStats.bestPct)}, worst ${pct1(data.closedStats.worstPct)} · most recent first`
              : 'most recent first'}
          </p>
          <ol className="book__holdings" data-lenis-prevent>
            {data.closed.map((c) => (
              <li key={`${c.symbol}-${c.closed}`}>
                <span className="book__symbol">{c.symbol}</span>
                <span className="book__basis">
                  ${c.entry.toFixed(2)}<em>&rarr;</em>${c.exit.toFixed(2)}
                </span>
                <span className="book__ret" data-sign={c.ret >= 0 ? 'up' : 'down'}>{pct1(c.ret)}</span>
                <span className="book__value">{c.opened} &ndash; {c.closed}</span>
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      <section className="book__section">
        <h2 className="book__heading">Activity</h2>
        <p className="book__meta">{data.rebalances.length} rebalances, most recent first</p>
        <ol className="book__activity">
          {[...data.rebalances].reverse().slice(0, 14).map((r) => (
            <li key={r.date}>
              <span className="book__when">{r.date}</span>
              <span className="book__what">
                Rebalanced · {r.longs} long{r.shorts ? `, ${r.shorts} short` : ''} ·{' '}
                {(r.turnover * 100).toFixed(0)}% turned over
              </span>
              <span className="book__tag">{r.reason}</span>
            </li>
          ))}
        </ol>
      </section>

      <p className="book__note">
        <a href="/book/method/">
          How this is built &mdash; and the four construction methods that were
          implemented, measured, and switched off
        </a>
        .
      </p>

      <p className="book__note">
        A simulation, not an account anybody holds. {money(data.stake)} compounded through a
        walk-forward backtest, monthly rebalancing, borrow and commission charged — and
        restricted on every single day to companies that were actually in the index that day.
      </p>
      <p className="book__note">
        <strong>What is still missing.</strong> Membership comes from{' '}
        {measured.snapshots} snapshots back to {measured.membershipRange[0].slice(0, 4)}, which fixes
        the companies that had not joined yet. It cannot fix the ones dropped after failing — their
        prices were never fetched, so they are absent from both universes. Every figure here is
        therefore still a little flattering, and the beat over SPY is small enough that it matters.
      </p>
    </div>
  );
}
