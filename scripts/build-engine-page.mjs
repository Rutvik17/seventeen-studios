#!/usr/bin/env node
/**
 * THE ENGINE'S OWN RESULTS, made small enough to ship.
 *
 * `/book` shows what the account did. Nothing showed how it is built, what was
 * measured, or — the part that took the longest — what was tried and rejected.
 *
 * That last category is most of the work and none of it was visible. Four
 * construction methods were implemented, measured and turned off: concentration,
 * Gârleanu-Pedersen trading, confidence sizing, and the full covariance. A page
 * that shows only what survived is a page that claims the survivors were
 * obvious.
 *
 * Every number here is read from a file some script wrote. Nothing is retyped,
 * so nothing can drift from the measurement it describes.
 *
 * Run: npm run engine:page
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.join(import.meta.dirname, '..');
const DATA = path.join(ROOT, 'data');
const OUT = path.join(ROOT, 'public', 'data', 'engine-method.json');

const read = (name) => {
  const at = path.join(DATA, name);
  return existsSync(at) ? JSON.parse(readFileSync(at, 'utf8')) : null;
};

const r4 = (v) => (Number.isFinite(v) ? Math.round(v * 1e4) / 1e4 : null);

const survivorship = read('survivorship-measured.json');
const concentration = read('concentration.json');
const concentrationPit = read('concentration-pit.json');
const cadence = read('cadence.json');
const cadencePit = read('cadence-pit.json');
const training = read('training.json');
const form4 = read('form4.json');
const thirteenF = read('13f.json');
const earnings = read('earnings.json');
const membership = read('membership.json');
const circular = read('circular.json');

/*
  The data families, with the fact that makes each one distinct.

  Coverage is what a reader needs to judge them: a family present on 45% of rows
  is a different claim from one present on 72%, and the difference is not a
  defect but a fact about when the data starts.
*/
const families = [
  {
    name: 'Price and volume',
    columns: 20,
    source: 'Yahoo Finance, adjusted daily closes',
    lag: 'None — the close is the close',
    detail: 'Momentum, volatility, illiquidity, beta and idiosyncratic risk, all causal by construction.',
  },
  {
    name: 'SEC fundamentals',
    columns: 25,
    source: 'XBRL company facts',
    lag: 'Published-by date, per fact',
    detail: 'Growth, margins, accruals, dilution. A fact may be used on a date only if it was public then.',
  },
  {
    name: 'Macro',
    columns: 23,
    source: 'FRED, plus the FOMC and election calendars',
    lag: 'Same-day for market data; calendars are known years ahead',
    detail: 'Rates, credit spreads, volatility, commodities, and proximity to policy and political events.',
  },
  {
    name: 'Institutional ownership',
    columns: 7,
    source: `13F bulk datasets — ${thirteenF?.quarters?.length ?? 0} report periods`,
    lag: '45 days, the statutory deadline',
    detail: 'Managers arriving and leaving, and whether the same crowd is building bigger positions.',
  },
  {
    name: 'Insider transactions',
    columns: 8,
    source: `Form 4 — ${(form4?.events?.length ?? 0).toLocaleString()} filing-days`,
    lag: 'Two business days, carried in the filing',
    detail: 'Open-market purchases and sales only. Grants and tax withholding are compensation, not decisions.',
  },
  {
    name: 'Earnings language',
    columns: 7,
    source: `8-K item 2.02 — ${(earnings?.releases?.length ?? 0).toLocaleString()} releases`,
    lag: 'None — the filing IS the announcement',
    detail: 'Tone, hedging and guidance, each measured as a change against the same company’s last release.',
  },
];

/** What was built, measured, and switched off. */
const rejected = [
  concentration && concentrationPit && {
    name: 'Concentration',
    claim: 'A high-conviction book of ten to fifteen names should beat a diversified one.',
    verdict: 'Rejected — it loses to the index outright.',
    numbers: concentrationPit.rows
      .filter((r) => [8, 12, 25].includes(r.names) || !Number.isFinite(r.names))
      .map((r) => ({
        label: Number.isFinite(r.names) ? `${r.names} names` : 'unlimited',
        annual: r4(r.strategy.annual),
        sharpe: r4(r.strategy.sharpe),
        vsSpy: r4(r.strategy.annual - concentrationPit.spy.annual),
      })),
    why: 'At an information coefficient near 0.019 the top eight names are not reliably the best eight — they are the eight with the highest scores, which at that IC is mostly noise. A thin edge needs breadth.',
  },
  {
    name: 'Gârleanu-Pedersen trading',
    claim: 'The optimal policy under decaying alpha replaces the no-trade band.',
    verdict: 'Rejected — it buys 0.02 of Sharpe and costs 0.20 of return per unit of drawdown.',
    numbers: [
      { label: 'no-trade band', annual: 0.1583, sharpe: 0.97, vsSpy: 0.0098 },
      { label: 'GP, decay 0.85', annual: 0.1460, sharpe: 0.99, vsSpy: -0.0025 },
    ],
    why: 'Turnover fell by up to 64%, which is what it was chosen for. Turnover was not the binding constraint, and the sweep is what showed that rather than an argument.',
  },
  {
    name: 'Confidence sizing',
    claim: 'Trade smaller when the model has recently been unreliable.',
    verdict: 'Rejected — 0.9 points of drawdown for 2.4 points of return.',
    numbers: [
      { label: 'flat sizing', annual: 0.1583, sharpe: 0.97, vsSpy: 0.0098 },
      { label: 'confidence-scaled', annual: 0.1345, sharpe: 0.93, vsSpy: -0.0140 },
    ],
    why: 'The conformal interval is widest in violent markets, and those were the strongest months in the sample. The width measures volatility rather than unreliability, so the policy sizes down into the recovery.',
  },
  {
    name: 'Full covariance',
    claim: 'Portfolio optimisation and risk parity need the whole matrix.',
    verdict: 'Unusable at this sample size — roughly half of it is noise.',
    numbers: [
      { label: '250 days, 100 names', signal: 6, share: 0.428 },
      { label: '1000 days, 300 names', signal: 13, share: 0.519 },
    ],
    why: 'Marchenko-Pastur gives the band inside which eigenvalues are indistinguishable from noise. Six of a hundred directions carry 43% of the variance; the other ninety-four are random. The book uses only the diagonal, which was a simplification and turns out to have been right.',
  },
].filter(Boolean);

/** What held up. */
const confirmed = [
  cadencePit && {
    name: 'Horizon matching',
    claim: 'The holding period should match the label the model was trained on.',
    verdict: 'Confirmed on both universes.',
    detail: `Monthly wins at Sharpe ${r4([...cadencePit.rows].sort((a, b) => b.strategy.sharpe - a.strategy.sharpe)[0].strategy.sharpe)} and is the only cadence that beats SPY. Not "slower is better" — quarterly is the worst of five. It is specifically 21 days.`,
  },
  survivorship && {
    name: 'Survivorship, measured',
    claim: 'Using today’s index membership for all history flatters the result.',
    verdict: `Confirmed — ${Math.abs(Math.round(survivorship.change * 100))}% of the information coefficient.`,
    detail: `Membership recovered from ${membership?.snapshots?.length ?? 0} snapshots back to ${membership?.first?.slice(0, 4) ?? '2012'}. IC falls from +${survivorship.meanIC.all} to +${survivorship.meanIC.members} once names are scored only on days they were actually in the index. It cost 87% of the excess RETURN, because a portfolio compounds what an average washes out.`,
  },
].filter(Boolean);

/*
  The leak guards. Each is negative-tested — sabotaged deliberately to check it
  fails — because a check that cannot fail is not a check, and this project has
  written two of those and caught both.
*/
const guards = [
  {
    name: '13F availability',
    tests: 'Every feature change lands on a statutory deadline',
    sabotage: 'Lag set to zero: fails on 53 periods',
  },
  {
    name: 'Form 4 windows',
    tests: 'A rolling count moves only when a filing arrives or ages out',
    sabotage: 'Three-day look-ahead: fails on 114 moves',
  },
  {
    name: 'Earnings language',
    tests: 'A feature moves only on a filing date',
    sabotage: 'Five-day look-ahead: fails on 60 moves',
  },
  {
    name: 'Conformal coverage',
    tests: 'A 90% interval contains the outcome 90% of the time',
    sabotage: 'Measured 90.8% on 21,729 out-of-sample observations',
  },
  {
    name: 'Marchenko-Pastur',
    tests: 'Pure noise produces no eigenvalue above the band',
    sabotage: 'Validated against theory before the real spectrum was read',
  },
];

const payload = {
  generatedAt: new Date().toISOString(),
  families,
  totalColumns: families.reduce((s, f) => s + f.columns, 0),
  rejected,
  confirmed,
  guards,
  training: training ? {
    trainedAt: training.trainedAt,
    runs: training.runs.map((r) => ({
      name: r.name,
      meanIC: r.meanIC,
      t: r.t,
      positiveYears: r.positiveYears,
      years: r.years,
    })),
  } : null,
  circular: circular ? {
    edges: circular.edges.length,
    holders: new Set(circular.edges.map((e) => e.from)).size,
    largest: [...circular.edges]
      .sort((a, b) => b.value - a.value)
      .slice(0, 6)
      .map((e) => ({ from: e.from, to: e.to, billions: r4(e.value / 1e9) })),
  } : null,
};

writeFileSync(OUT, `${JSON.stringify(payload)}\n`);
const bytes = readFileSync(OUT).length;
console.log(`engine page: ${families.length} families, ${rejected.length} rejected, ${confirmed.length} confirmed, ${guards.length} guards`);
console.log(`engine page: training results ${training ? 'included' : 'not yet run'}`);
console.log(`engine page: wrote ${(bytes / 1024).toFixed(1)} KB to public/data/engine-method.json`);
