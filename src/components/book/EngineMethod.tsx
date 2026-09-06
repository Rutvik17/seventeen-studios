'use client';

/**
 * HOW THE BOOK IS BUILT, AND WHAT WAS THROWN AWAY.
 *
 * `/book` shows the account. This shows the engine behind it — and, more to the
 * point, the four construction methods that were implemented, measured and
 * switched off.
 *
 * That last part is most of the work and none of it was visible. A page showing
 * only what survived implies the survivors were obvious, when in fact each one
 * won a measurement against a plausible alternative. The rejected column is the
 * evidence that the choices were made rather than assumed.
 */

import { useEffect, useState } from 'react';
import { asset } from '@/lib/asset';

type Family = {
  name: string;
  columns: number;
  source: string;
  lag: string;
  detail: string;
};

type Verdict = {
  name: string;
  claim: string;
  verdict: string;
  why?: string;
  detail?: string;
  numbers?: Array<{
    label: string;
    annual?: number;
    sharpe?: number;
    vsSpy?: number;
    signal?: number;
    share?: number;
  }>;
};

type Guard = { name: string; tests: string; sabotage: string };

type Method = {
  families: Family[];
  totalColumns: number;
  rejected: Verdict[];
  confirmed: Verdict[];
  guards: Guard[];
  training: {
    trainedAt: string;
    runs: Array<{ name: string; meanIC: number; t: number; positiveYears: number; years: number }>;
  } | null;
  circular: {
    edges: number;
    holders: number;
    largest: Array<{ from: string; to: string; billions: number }>;
  } | null;
};

const pct = (v: number | undefined) =>
  v === undefined ? '' : `${v >= 0 ? '+' : ''}${(v * 100).toFixed(1)}%`;

export function EngineMethod() {
  const [data, setData] = useState<Method | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    fetch(asset('/data/engine-method.json'))
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((j: Method) => { if (alive) setData(j); })
      .catch(() => { if (alive) setFailed(true); });
    return () => { alive = false; };
  }, []);

  if (failed) return <p className="book__empty">The method data did not load.</p>;
  if (!data) return <p className="book__empty">Loading…</p>;

  return (
    <div className="method">
      <section className="book__section">
        <h2 className="book__heading">
          What it reads <span className="book__count">{data.totalColumns} columns</span>
        </h2>
        <p className="book__meta">
          Six families. Each is optional, because the only way to know whether one
          carries information is to build the panel twice and change nothing else.
        </p>
        <ul className="method__families">
          {data.families.map((f) => (
            <li key={f.name}>
              <div className="method__family-head">
                <span className="method__family-name">{f.name}</span>
                <span className="method__count">{f.columns}</span>
              </div>
              <p className="method__detail">{f.detail}</p>
              <dl className="method__meta">
                <div><dt>Source</dt><dd>{f.source}</dd></div>
                <div><dt>Lag</dt><dd>{f.lag}</dd></div>
              </dl>
            </li>
          ))}
        </ul>
      </section>

      {/*
        The rejected methods come BEFORE the confirmed ones, deliberately. They
        are the harder result and the one a reader learns more from — anybody
        can list what they kept.
      */}
      <section className="book__section">
        <h2 className="book__heading">
          Built, measured, switched off <span className="book__count">{data.rejected.length}</span>
        </h2>
        <p className="book__meta">
          Each of these was implemented in full and turned off by a measurement,
          not by an argument.
        </p>
        {data.rejected.map((v) => (
          <article key={v.name} className="method__verdict">
            <h3>{v.name}</h3>
            <p className="method__claim">{v.claim}</p>
            <p className="method__result" data-kind="rejected">{v.verdict}</p>
            {v.numbers?.length ? (
              <table className="method__table">
                <tbody>
                  {v.numbers.map((n) => (
                    <tr key={n.label}>
                      <th scope="row">{n.label}</th>
                      {n.annual !== undefined && <td>{pct(n.annual)}</td>}
                      {n.sharpe !== undefined && <td>Sharpe {n.sharpe.toFixed(2)}</td>}
                      {n.vsSpy !== undefined && (
                        <td data-sign={n.vsSpy >= 0 ? 'up' : 'down'}>{pct(n.vsSpy)} vs SPY</td>
                      )}
                      {n.signal !== undefined && <td>{n.signal} real directions</td>}
                      {n.share !== undefined && <td>{(n.share * 100).toFixed(1)}% of variance</td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : null}
            {v.why ? <p className="method__why">{v.why}</p> : null}
          </article>
        ))}
      </section>

      <section className="book__section">
        <h2 className="book__heading">
          Held up <span className="book__count">{data.confirmed.length}</span>
        </h2>
        {data.confirmed.map((v) => (
          <article key={v.name} className="method__verdict">
            <h3>{v.name}</h3>
            <p className="method__claim">{v.claim}</p>
            <p className="method__result" data-kind="confirmed">{v.verdict}</p>
            {v.detail ? <p className="method__why">{v.detail}</p> : null}
          </article>
        ))}
      </section>

      <section className="book__section">
        <h2 className="book__heading">
          Look-ahead guards <span className="book__count">{data.guards.length}</span>
        </h2>
        <p className="book__meta">
          Every one is negative-tested — sabotaged on purpose to check it fails.
          A check that cannot fail is not a check, and two were written here that
          could not.
        </p>
        <table className="book__table method__guards">
          <thead>
            <tr><th scope="col">Guard</th><th scope="col">What it asserts</th><th scope="col">Under sabotage</th></tr>
          </thead>
          <tbody>
            {data.guards.map((g) => (
              <tr key={g.name}>
                <th scope="row">{g.name}</th>
                <td>{g.tests}</td>
                <td>{g.sabotage}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {data.circular ? (
        <section className="book__section">
          <h2 className="book__heading">
            Who owns whom <span className="book__count">{data.circular.holders} companies</span>
          </h2>
          <p className="book__meta">
            Non-financial index members holding equity in other listed companies,
            from their own 13F filings — customers, suppliers and partners.
          </p>
          <table className="book__table">
            <tbody>
              {data.circular.largest.map((e) => (
                <tr key={`${e.from}-${e.to}`}>
                  <th scope="row">{e.from}</th>
                  <td className="method__target">{e.to}</td>
                  <td>${e.billions.toFixed(2)}B</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : null}

      {data.training ? (
        <section className="book__section">
          <h2 className="book__heading">Does the new data help?</h2>
          <p className="book__meta">
            Identical folds, identical seed, one family added at a time. Information
            coefficient is the rank correlation between prediction and outcome;
            published equity models live between 0.02 and 0.06.
          </p>
          <table className="book__table">
            <thead>
              <tr><th scope="col">Panel</th><th scope="col">Mean IC</th><th scope="col">t</th><th scope="col">Years up</th></tr>
            </thead>
            <tbody>
              {data.training.runs.map((r) => (
                <tr key={r.name}>
                  <th scope="row">{r.name}</th>
                  <td data-sign={r.meanIC >= 0 ? 'up' : 'down'}>
                    {r.meanIC >= 0 ? '+' : ''}{r.meanIC.toFixed(4)}
                  </td>
                  <td>{r.t.toFixed(1)}</td>
                  <td>{r.positiveYears}/{r.years}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : (
        <section className="book__section">
          <h2 className="book__heading">Does the new data help?</h2>
          <p className="book__meta">
            Not yet answered. The comparison needs a walk-forward run across eight
            panels and fourteen years, and it will appear here when it has one.
          </p>
        </section>
      )}
    </div>
  );
}
