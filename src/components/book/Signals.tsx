'use client';

/**
 * WHAT THE FILINGS SAY ABOUT WHAT THE BOOK HOLDS.
 *
 * The account above is the result. This is the evidence underneath it: for the
 * names actually held, what their own officers did with their own money, what
 * institutions did with the position last quarter, what the company reported
 * for its last quarter, and what it owns of other companies.
 *
 * ---
 * WHY OWNERSHIP IS TWO SECTIONS AND NOT ONE
 *
 * It was one, called "who owns whom", and that put Ventas owning a hospital
 * operator beside NVIDIA owning CoreWeave as though they were the same kind of
 * fact. They are not: the second is a financing loop, where the investor is
 * also the supplier and the money comes back as revenue.
 *
 * A 13F cannot tell them apart — it establishes the stake and says nothing
 * about whether the two companies trade. So the split is evidenced rather than
 * inferred: a stake is called circular only where a filing describes a
 * commercial relationship between the two, and the sentence is quoted with a
 * link to the document.
 *
 * ---
 * WHY EVERY SECTION IS FILTERED TO THE BOOK
 *
 * Half a million insider filings is a database. The same data cut to the
 * eighty-seven names actually held is a position sheet, and an officer buying
 * a stock the model already owns is a different fact from an officer buying
 * something nobody holds.
 *
 * ---
 * WHY THE NUMBERS ARE ARRANGED THE WAY THEY ARE
 *
 * Every ranking here is by dollars, and every count is labelled as a count of
 * FILINGS rather than of people, because filings is what the source has. The
 * distinction is not pedantry: ranked by filing count, the largest insider buy
 * in the book was a Texas Pacific Land plan buying about $890 a day, 212 days
 * running, which outranked a $50.9M purchase at KKR by 27 to 1.
 */

import { useEffect, useState } from 'react';
import { asset } from '@/lib/asset';

type Buying = {
  symbol: string;
  buyFilings: number;
  sellFilings: number;
  buyValue: number;
  last: string;
  weight: number;
};
type Selling = { symbol: string; sellFilings: number; sellValue: number; last: string; weight: number };
type Flow = { symbol: string; holders: number; change: number; weight: number };
type Reported = {
  symbol: string;
  filed: string;
  quarter: string;
  revenue: number | null;
  revenueGrowth: number | null;
  eps: number | null;
  epsPrior: number | null;
  guidance: number;
  weight: number;
};
type Evidence = {
  quote: string;
  filer: string;
  form: string;
  filed: string;
  url: string;
  direction: 'investee' | 'investor';
};
type Stake = {
  from: string;
  fromName: string;
  to: string;
  ticker: string | null;
  billions: number;
  change: number | null;
  evidence: Evidence | null;
};

type Data = {
  asOf: string;
  bookSize: number;
  window: { since: string; until: string };
  insider: { buying: Buying[]; selling: Selling[]; corpusBuys: number; corpusSells: number };
  flows: {
    period: string | null;
    previous: string | null;
    inflow: Flow[];
    outflow: Flow[];
    compared: number;
    excluded: number;
    floor: number;
  };
  reported: {
    growing: Reported[];
    shrinking: Reported[];
    covered: number;
    withGrowth: number;
    raised: number;
    lowered: number;
  };
  stakes: {
    period: string;
    prior: string | null;
    list: Stake[];
    total: number;
    holders: number;
    billions: number;
  };
  circular: {
    period: string;
    prior: string | null;
    list: Stake[];
    total: number;
    holders: number;
    billions: number;
    considered: number;
    resolved: number;
    floor: number;
    tail: number;
    tailBillions: number;
  };
};

const money = (v: number) =>
  v >= 1e9 ? `$${(v / 1e9).toFixed(1)}B` : v >= 1e6 ? `$${(v / 1e6).toFixed(1)}M` : `$${Math.round(v / 1e3)}k`;
const pct = (v: number) => `${v >= 0 ? '+' : ''}${(v * 100).toFixed(1)}%`;
/* EPS is small and signed, so it keeps its cents and its minus sign. */
const dollars = (v: number) => `${v < 0 ? '-' : ''}$${Math.abs(v).toFixed(2)}`;
const billions = (v: number) => `$${v.toFixed(2)}B`;
const filings = (n: number) => `${n} filing${n === 1 ? '' : 's'}`;

/*
  The two SEC feeds date their quarters differently and this has already been
  wrong once on screen: 13F carries an ISO date, "2026-03-31", and the 13F rows
  inside a corporate filing carry "31-MAR-2026". One formatter reading both as
  the second shape rendered "12 31 to 03 31" where the sentence wanted
  "Dec 2025 to Mar 2026".
*/
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const quarter = (p: string | null) => {
  if (!p) return '';
  const iso = /^(\d{4})-(\d{2})-\d{2}$/.exec(p);
  if (iso) return `${MONTHS[Number(iso[2]) - 1]} ${iso[1]}`;
  const [, mon, year] = p.split('-');
  if (!mon || !year) return p;
  return `${mon.charAt(0)}${mon.slice(1).toLowerCase()} ${year}`;
};

/* A negative weight is a short. Which side the book is on changes what a filing means. */
const side = (weight: number) => (weight < 0 ? 'short' : 'long');

export function Signals() {
  const [data, setData] = useState<Data | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    fetch(asset('/data/signals.json'))
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((j: Data) => {
        if (alive) setData(j);
      })
      .catch(() => {
        if (alive) setFailed(true);
      });
    return () => {
      alive = false;
    };
  }, []);

  if (failed) return <p className="book__empty">The filings did not load.</p>;
  if (!data) return <p className="book__empty">Reading the filings…</p>;

  const sellRatio = data.insider.corpusSells / data.insider.corpusBuys;

  return (
    <div className="signals">
      <section className="book__section">
        <h2 className="book__heading">What the insiders did</h2>
        <p className="book__meta">
          Form 4, due within two business days of the trade. Open-market
          transactions only — grants and tax withholding are stripped out,
          because being paid in stock is not a view. Across the whole corpus
          insiders sell {sellRatio.toFixed(1)} times for every purchase, which
          is why the two sides are not read the same way: a sale has a dozen
          explanations that have nothing to do with the company, and a purchase
          has one. Year to {data.asOf}, ranked by size.
        </p>

        <div className="signals__split">
          <div className="signals__column">
            <h3 className="signals__sub" data-sign="up">
              Bought <span className="book__count">{data.insider.buying.length} names</span>
            </h3>
            <ol className="signals__rows">
              {data.insider.buying.map((r) => (
                <li key={r.symbol}>
                  <span className="signals__symbol">
                    {r.symbol}
                    {side(r.weight) === 'short' ? <em className="signals__side">short</em> : null}
                  </span>
                  <span className="signals__value" data-sign="up">
                    {money(r.buyValue)}
                  </span>
                  <span className="signals__fact">
                    {filings(r.buyFilings)}
                    {r.sellFilings > 0 ? ` · ${r.sellFilings} selling` : ''}
                  </span>
                  <span className="signals__when">{r.last}</span>
                </li>
              ))}
            </ol>
          </div>

          <div className="signals__column">
            <h3 className="signals__sub" data-sign="down">
              Sold, and nobody bought <span className="book__count">{data.insider.selling.length} names</span>
            </h3>
            <ol className="signals__rows">
              {data.insider.selling.map((r) => (
                <li key={r.symbol}>
                  <span className="signals__symbol">
                    {r.symbol}
                    {side(r.weight) === 'short' ? <em className="signals__side">short</em> : null}
                  </span>
                  <span className="signals__value" data-sign="down">
                    {money(r.sellValue)}
                  </span>
                  <span className="signals__fact">{filings(r.sellFilings)}</span>
                  <span className="signals__when">{r.last}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      <section className="book__section">
        <h2 className="book__heading">Where the institutions went</h2>
        <p className="book__meta">
          13F, filed by every manager running over $100M and public 45 days
          after the quarter closes. The change is the count of managers holding
          the name, {quarter(data.flows.previous)} to {quarter(data.flows.period)}{' '}
          — a count rather than a dollar figure because the SEC switched 13F
          from reporting thousands to whole dollars part-way through the
          history, so the value column does not compare across it and a
          headcount does. {data.flows.compared} of the {data.bookSize} names
          have a comparable pair
          {data.flows.excluded > 0
            ? `; ${data.flows.excluded} report fewer than ${data.flows.floor} holders, which is a failed name match rather than a real ownership base, and are left out`
            : ''}
          .
        </p>

        <div className="signals__split">
          <div className="signals__column">
            <h3 className="signals__sub" data-sign="up">More managers arriving</h3>
            <ol className="signals__rows signals__rows--flow">
              {data.flows.inflow.map((r) => (
                <li key={r.symbol}>
                  <span className="signals__symbol">{r.symbol}</span>
                  <span className="signals__value" data-sign="up">
                    {pct(r.change)}
                  </span>
                  <span className="signals__fact">{r.holders.toLocaleString()} holders</span>
                </li>
              ))}
            </ol>
          </div>

          <div className="signals__column">
            <h3 className="signals__sub" data-sign="down">More leaving</h3>
            <ol className="signals__rows signals__rows--flow">
              {data.flows.outflow.map((r) => (
                <li key={r.symbol}>
                  <span className="signals__symbol">{r.symbol}</span>
                  <span className="signals__value" data-sign={r.change >= 0 ? 'up' : 'down'}>
                    {pct(r.change)}
                  </span>
                  <span className="signals__fact">{r.holders.toLocaleString()} holders</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      <section className="book__section">
        <h2 className="book__heading">What they reported</h2>
        <p className="book__meta">
          The last quarter each company has actually announced: revenue and
          diluted earnings per share out of its own XBRL filing, against the
          same quarter a year earlier. {data.reported.raised} of the book raised
          guidance in the release and {data.reported.lowered} lowered it, which
          is the one thing only the 8-K knows. {data.reported.covered} of the{' '}
          {data.bookSize} names have reported a quarter,{' '}
          {data.reported.withGrowth} of them with a comparable quarter a year
          before. Ranked by revenue growth, best and worst.
        </p>
        <div className="signals__scroll" data-lenis-prevent>
          <table className="book__table signals__table">
            <thead>
              <tr>
                <th scope="col">Name</th>
                <th scope="col">Quarter</th>
                <th scope="col">Revenue</th>
                <th scope="col">vs year</th>
                <th scope="col">EPS</th>
                <th scope="col">year ago</th>
                <th scope="col">Guidance</th>
                <th scope="col">Announced</th>
              </tr>
            </thead>
            <tbody>
              {[...data.reported.growing, ...data.reported.shrinking].map((r) => (
                <tr key={r.symbol}>
                  <th scope="row">{r.symbol}</th>
                  <td className="signals__dim">{r.quarter}</td>
                  <td>{r.revenue === null ? '—' : money(r.revenue)}</td>
                  <td data-sign={(r.revenueGrowth ?? 0) >= 0 ? 'up' : 'down'}>
                    {r.revenueGrowth === null ? '—' : pct(r.revenueGrowth)}
                  </td>
                  <td data-sign={(r.eps ?? 0) >= 0 ? 'up' : 'down'}>
                    {r.eps === null ? '—' : dollars(r.eps)}
                  </td>
                  <td className="signals__dim">
                    {r.epsPrior === null ? '—' : dollars(r.epsPrior)}
                  </td>
                  <td data-sign={r.guidance > 0 ? 'up' : r.guidance < 0 ? 'down' : undefined}>
                    {r.guidance > 0 ? 'raised' : r.guidance < 0 ? 'lowered' : '—'}
                  </td>
                  <td className="signals__dim">{r.filed}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="book__meta">
          EPS is the diluted figure as the company struck it, never net income
          divided by a share count — the share-count tag on a cover page is
          updated irregularly, and for some names the newest one is two years
          older than the newest income figure, so dividing gives a number that
          is wrong and looks entirely reasonable.
        </p>
      </section>

      <Circular circular={data.circular} />
      <EquityStakes stakes={data.stakes} />


      <p className="book__note">
        Every figure on this page is out of a filing, and every filing is free:
        Form 4 within two business days, 13F 45 days after the quarter, the 8-K
        the same day results are announced, and the revenue and EPS out of the
        XBRL that accompanies the quarterly report. The 13F holdings are read
        per company from EDGAR rather than from the SEC&rsquo;s quarterly bulk
        files, which run a full period behind — at the time of writing the
        newest bulk file stopped a quarter short of the largest position in the
        whole dataset. None of this is a subscription and none of it is a
        forecast: it is what has already been reported, joined to what the
        account is currently carrying.
      </p>
    </div>
  );
}

/* ------------------------------------------------- circular financing */

/*
  THE LOOP, WITH THE SENTENCE THAT ESTABLISHES IT.

  A 13F proves the stake and nothing else. Whether the two companies also trade
  with each other — which is the whole of what makes a stake "circular" — is
  not in that filing and cannot be inferred from it. Every rule considered was
  a proxy that would have been wrong: same sector catches Gilead and Arcus, a
  real licensing loop, and also catches Merck's ordinary biotech portfolio.

  So nothing is classified here. A pair appears in this section only because
  one of the two companies said so in a filing, and the sentence that says it
  is printed with a link to the document. A reader who does not believe it can
  go and read it.
*/
function Circular({ circular }: { circular: Data['circular'] }) {
  if (!circular.list.length) return null;

  return (
    <section className="book__section">
      <h2 className="book__heading">
        Circular financing <span className="book__count">{circular.total} pairs</span>
      </h2>
      <p className="book__meta">
        Money that leaves as an investment and comes back as revenue: the
        investor is also the investee&rsquo;s supplier or its customer. Of the{' '}
        {circular.considered} stakes held at {quarter(circular.period)},{' '}
        {circular.total} have a filing describing a commercial relationship
        between the two companies &mdash; {billions(circular.billions)} of the
        total. The rest are equity stakes and nothing more, which is all a 13F
        establishes.
        {circular.tail > 0 ? (
          <>
            {' '}Shown here are the {circular.list.length} worth more than $
            {(circular.floor * 1000).toFixed(0)}M, which is{' '}
            {((1 - circular.tailBillions / circular.billions) * 100).toFixed(1)}%
            of the money; the other {circular.tail} are real and disclosed and
            come to {billions(circular.tailBillions)} between them.
          </>
        ) : null}
      </p>

      <ol className="circ">
        {circular.list.map((s) => (
          <li key={`${s.from}-${s.to}`} className="circ__pair">
            <div className="circ__flow">
              <span className="circ__from">{s.from}</span>
              <span className="circ__arrow" aria-hidden>
                <i />
                <b>{billions(s.billions)}</b>
              </span>
              <span className="circ__to">
                {s.to}
                {s.ticker ? <em className="circ__ticker">{s.ticker}</em> : null}
              </span>
              {s.change !== null ? (
                <span className="circ__change" data-sign={s.change >= 0 ? 'up' : 'down'}>
                  {pct(s.change)} on the quarter
                </span>
              ) : null}
            </div>
            <blockquote className="circ__quote">
              <p>&ldquo;{s.evidence?.quote}&rdquo;</p>
              <footer>
                <a href={s.evidence?.url} target="_blank" rel="noreferrer noopener">
                  {s.evidence?.filer} &middot; {s.evidence?.form} filed {s.evidence?.filed}
                </a>
                {/*
                  Which side said it matters. A supplier naming its customer is
                  the stronger claim, because customer concentration is a
                  disclosure the company is required to make; an investor
                  describing its own investee is the weaker one.
                */}
                <span className="circ__side">
                  {s.evidence?.direction === 'investee' ? 'the investee' : 'the investor'} disclosed it
                </span>
              </footer>
            </blockquote>
          </li>
        ))}
      </ol>
    </section>
  );
}

/* ---------------------------------------------------------- equity stakes */

/*
  EVERYTHING ELSE, DRAWN RATHER THAN LISTED.

  A list of "GOOG -> CME Group, $0.77B" rows reads as a set of unrelated facts.
  The thing worth seeing is the SHAPE: that a handful of companies account for
  most of the money, and where it points.

  Bipartite because the data is: holders on the left, what they hold on the
  right, one row per stake. A force layout would look more like a network
  diagram and be harder to read every value off, which is the trade the wrong
  way round.
*/

const W = 780;
const ROW = 30;
const PAD_Y = 18;
const X_HOLDER = 128;
/*
  The target column sits where it does because of the longest issuer name in
  the data, not because of the middle of the canvas: at 470 the label for
  "Waterbridge Infrastructure" ran under its own dollar figure. 430 leaves
  262px before the amounts, which is 36 monospace characters.
*/
const X_TARGET = 430;
const X_AMOUNT = W - 76;

function EquityStakes({ stakes }: { stakes: Data['stakes'] }) {
  const list = stakes.list;
  if (!list.length) return null;

  /* Holders ordered by money committed, their stakes ordered the same way. */
  const totals = new Map<string, number>();
  for (const e of list) totals.set(e.from, (totals.get(e.from) ?? 0) + e.billions);
  const holders = [...totals.keys()].sort((a, b) => (totals.get(b) ?? 0) - (totals.get(a) ?? 0));

  const ordered = holders.flatMap((h) =>
    list.filter((e) => e.from === h).sort((a, b) => b.billions - a.billions));

  const y = (i: number) => PAD_Y + i * ROW + ROW / 2;
  const H = PAD_Y * 2 + ordered.length * ROW;

  /* Mean row of a holder's own stakes, so its label sits beside its bundle. */
  const holderY = new Map(
    holders.map((h) => {
      const rows = ordered.flatMap((e, i) => (e.from === h ? [i] : []));
      return [h, rows.reduce((t, i) => t + y(i), 0) / rows.length];
    }),
  );

  const max = Math.max(...list.map((e) => e.billions));
  /*
    Square-rooted, so the smallest stake is about a fifth of the stroke of the
    largest rather than a thirtieth of it. Linear width would render the small
    end as a hairline and the page would show four stakes instead of twenty.
  */
  const width = (v: number) => 1.2 + Math.sqrt(v / max) * 7;

  return (
    <section className="book__section">
      <h2 className="book__heading">
        Equity stakes <span className="book__count">{stakes.total} stakes</span>
      </h2>
      <p className="book__meta">
        Index members that are not banks, filing a 13F because they hold equity
        in other listed companies. These are the ones where no filing describes
        a trade between the two &mdash; ordinary corporate investment, as far as
        the record shows: {billions(stakes.billions)} across {stakes.holders}{' '}
        companies at {quarter(stakes.period)}. Largest {ordered.length}, with
        the move since {quarter(stakes.prior)}.
      </p>

      <figure className="signals__figure">
        {/*
          Above the diagram rather than in the caption below it, because a
          reader who cannot see the labels needs telling before the scroll, not
          after five hundred pixels of unexplained lines.
        */}
        <p className="signals__hint">Scroll the diagram sideways for the names and the amounts &rarr;</p>
        <div className="signals__scroll" data-lenis-prevent>
          <svg
            viewBox={`0 0 ${W} ${H}`}
            width={W}
            height={H}
            role="img"
            aria-label="Equity stakes held by index members in other listed companies"
          >
            <title>Equity stakes</title>

            {ordered.map((e, i) => {
              const y1 = holderY.get(e.from) ?? y(i);
              const y2 = y(i);
              const mid = (X_HOLDER + X_TARGET) / 2;
              return (
                <path
                  key={`${e.from}-${e.to}`}
                  className="signals__link"
                  d={`M ${X_HOLDER} ${y1} C ${mid} ${y1}, ${mid} ${y2}, ${X_TARGET} ${y2}`}
                  strokeWidth={width(e.billions)}
                />
              );
            })}

            {holders.map((h) => {
              const hy = holderY.get(h) ?? 0;
              return (
                <g key={h}>
                  <text className="signals__node" x={X_HOLDER - 12} y={hy + 4} textAnchor="end">{h}</text>
                  <circle className="signals__dot" cx={X_HOLDER} cy={hy} r={3.5} />
                </g>
              );
            })}

            {ordered.map((e, i) => (
              <g key={`t-${e.from}-${e.to}`}>
                <circle className="signals__dot" cx={X_TARGET} cy={y(i)} r={3} />
                <text className="signals__target" x={X_TARGET + 12} y={y(i) + 4}>{e.to}</text>
                <text className="signals__amount" x={X_AMOUNT} y={y(i) + 4} textAnchor="end">
                  {billions(e.billions)}
                </text>
                <text
                  className="signals__move"
                  data-sign={e.change === null ? undefined : e.change >= 0 ? 'up' : 'down'}
                  x={W - 8}
                  y={y(i) + 4}
                  textAnchor="end"
                >
                  {e.change === null ? '—' : pct(e.change)}
                </text>
              </g>
            ))}
          </svg>
        </div>
        <figcaption className="book__meta">
          Thickness is the size of the stake, square-rooted so the small ones
          stay visible. A dash in the last column means the stake has no earlier
          quarter on file, not that it is new.
        </figcaption>
      </figure>
    </section>
  );
}
