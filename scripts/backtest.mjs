/**
 * The backtest: replay the tape, run the book, score it against SPY.
 *
 *   npm run backtest              one run, with the defaults
 *   npm run backtest -- --sweep   sweep the construction parameters
 *
 * Reads `data/tape.json` and trains nothing. Everything here is book
 * construction and risk, which is what the last run showed was actually broken.
 *
 * ---
 * POSITIONS DRIFT, WHICH THEY DID NOT BEFORE
 *
 * The previous version stored target WEIGHTS and left them unchanged between
 * rebalances. That quietly rebalances the book to target every single day, for
 * free, which is not a thing anyone can do — and it makes a no-trade band
 * meaningless, because nothing ever drifts far enough to breach one.
 *
 * Positions are now held as VALUES. A name that doubles becomes twice the book
 * it was, exactly as it would in an account, and the weights that come back are
 * whatever the market left behind.
 *
 * ---
 * THE NO-TRADE BAND
 *
 * Turnover measured 71% of the book per week — 3,708% a year, costing 3.7% of
 * capital against a 2.55% shortfall to SPY. The strategy was beating the index
 * gross of costs and paying it all away in churn, because a small wobble in a
 * score pushed a name across the conviction threshold and back again.
 *
 * A band fixes the cause rather than the symptom: a position is left alone
 * unless the target differs from what is held by more than `band` of the book.
 * Trading to a target you are already near is paying commission to move a
 * position a distance the model cannot resolve.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildTargets, BOOK } from '../src/lib/engine/book.ts';
import { TRADING, tradingRate, aimWeight } from '../src/lib/engine/trading.ts';
import { exposureFor, REGIME } from '../src/lib/engine/regime.ts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = path.join(root, 'data');

const tape = JSON.parse(readFileSync(path.join(dataDir, 'tape.json'), 'utf8'));

/*
  POINT-IN-TIME MEMBERSHIP, optional.

  With `--pointInTime` a name is only a candidate on days it was actually in the
  index, using the 110 states recovered from the constituents repository's git
  history. Without it the book may hold anything in today's universe on any
  past day, which is the survivorship bias every figure here carries.

  This gates SELECTION, not training. The scores are whatever the model already
  said; the book simply cannot buy what it could not have bought.
*/
const pointInTime = process.argv.includes('--pointInTime');
let memberAt = null;
if (pointInTime) {
  const file = path.join(dataDir, 'membership.json');
  if (!existsSync(file)) {
    console.error('backtest: --pointInTime needs data/membership.json — run `npm run membership`');
    process.exit(1);
  }
  const snaps = JSON.parse(readFileSync(file, 'utf8')).snapshots;
  memberAt = [];
  let cursor = -1;
  for (const d of tape.dates) {
    while (cursor + 1 < snaps.length && snaps[cursor + 1].date <= d) cursor += 1;
    memberAt.push(cursor < 0 ? null : (snaps[cursor].set ??= new Set(snaps[cursor].symbols)));
  }
}
const { symbols, dates, scores, volatility, close, market } = tape;

const pct = (v) => `${(v * 100).toFixed(2)}%`;

function run(options) {
  const {
    /*
      MONTHLY, AND THIS IS PRINCIPLED RATHER THAN TUNED.

      The label is the 21-day forward excess return, so the model has only ever
      been asked what a name does over roughly a month. Rebalancing weekly kept
      closing positions before the predicted move had played out — asking a
      21-day model to justify 5-day decisions.

      Measured across the sweep, monthly won on return (22.40% vs 14.85% for
      SPY), on Sharpe (1.20 vs 0.91) and on drawdown (22.51% vs 33.72%). It is
      NOT winning on costs: its annual turnover is higher than the wide-band
      weekly variants. It wins because the holding period finally matches the
      horizon the model was trained on.
    */
    rebalanceEvery = 21,
    band = 0.005,
    /*
      Garleanu-Pedersen instead of the band. Off by default so the two can be
      measured against each other on identical folds — the band is worth about
      two points a year and has to be beaten, not assumed obsolete.
    */
    optimalTrading = false,
    decay = TRADING.decay,
    exposureFloor = 0.25,
    shortsRequireRiskOff = true,
    book = BOOK,
    regime = REGIME,
  } = options;

  /* Position VALUES, not weights. They drift with price between rebalances. */
  let held = new Map();

  /*
    COST BASIS, kept alongside the book rather than derived from it afterwards.

    The book works in dollar VALUES that drift with price, which is right for
    performance but says nothing about what was paid. An account statement has
    to answer "bought at what?" — so every trade is also converted to a share
    count at the traded price and folded into a running average.

    Reconstructing this from the trade list later would be possible and wrong:
    the trade list is capped at 4,000 rows, so the early history is missing and
    any basis computed from it would silently start mid-position.
  */
  const lots = new Map();   // symbol -> { qty, cost, opened }
  const closed = [];        // positions that went to zero, with their P&L
  let cash = 1;
  let equity = 1;
  let peak = 1;
  let lastRebalance = -Infinity;

  const curve = [];
  const spyCurve = [];
  const journal = [];
  const trades = [];
  let tradedTotal = 0;

  for (let t = 0; t < dates.length; t++) {
    /*
      MARK TO MARKET BEFORE DECIDING. Yesterday's positions earn today's return
      on a book chosen without knowledge of it. The other order applies today's
      move to a book picked knowing that move, which is the quiet look-ahead
      that produces a beautiful curve.
    */
    if (t > 0) {
      for (const [s, value] of held) {
        const a = close[t - 1][s];
        const b = close[t][s];
        if (a > 0 && b > 0) held.set(s, value * (b / a));
        // A name that stopped printing keeps its last value rather than
        // vanishing — dropping it would silently book a gain of its own size.
      }
      // Borrow accrues daily on the short book.
      const shortValue = [...held.values()].filter((v) => v < 0).reduce((s, v) => s + Math.abs(v), 0);
      cash -= (shortValue * book.borrowBps) / 10_000 / 252;
    }

    equity = cash + [...held.values()].reduce((s, v) => s + v, 0);
    peak = Math.max(peak, equity);
    curve.push(equity);
    spyCurve.push(market[t].close / market[0].close);

    if (t - lastRebalance < rebalanceEvery) continue;
    if (!(equity > 0)) break; // wiped out; nothing left to trade

    const state = exposureFor(
      market[t].vol ?? NaN,
      (market[t].trend ?? 0) < 0,
      (peak - equity) / peak,
      regime,
    );
    /*
      FLOOR THE PRODUCT.

      Volatility scale, trend scale and drawdown scale each look reasonable and
      MULTIPLY. Measured on the last run they compounded to 0.05 — five percent
      invested — and left the book below half exposure a quarter of the time in
      a market compounding at 14.85%. Each dampener was defensible; their
      product was not, and nothing in the design said so.
    */
    const exposure = Math.max(exposureFloor, state.exposure);

    const members = memberAt ? memberAt[t] : null;

    const candidates = [];
    for (let s = 0; s < symbols.length; s++) {
      const score = scores[t][s];
      if (score == null) continue;
      // Could the book have owned this on this day?
      if (members && !members.has(symbols[s])) continue;
      candidates.push({ symbol: s, score, volatility: volatility[t][s] ?? NaN });
    }
    if (candidates.length < 50) continue;

    /*
      Shorts only when the market is not rewarding risk.

      The last run carried 26 shorts on average through a fourteen-year bull
      market. A short is a bet that a name falls FURTHER than the market rises,
      and in a rising tape that is a bet against the tide for most of the sample.
      Gating them on the regime lets the book carry none when none are deserved.
    */
    const riskOff = (market[t].trend ?? 0) < 0 || state.volScale < 0.9;
    const effectiveBook = shortsRequireRiskOff && !riskOff
      ? { ...book, maxShort: 0, shortThreshold: Infinity }
      : book;

    const targets = buildTargets(candidates, exposure, effectiveBook);
    const want = new Map(targets.map((x) => [x.symbol, x.weight * equity]));

    let traded = 0;
    const names = new Set([...held.keys(), ...want.keys()]);
    for (const s of names) {
      const from = held.get(s) ?? 0;
      let to = want.get(s) ?? 0;
      let delta = to - from;

      /*
        THE BAND. Leave it alone unless the gap is worth paying for. Applied to
        the DELTA as a fraction of the book, so it scales with account size
        rather than with the position.
      */
      /*
        THE BAND, or the closed form that replaces it.

        The band leaves a position alone unless the gap is worth paying for.
        Garleanu-Pedersen instead moves a constant fraction toward an AIM that
        discounts the target for decay — every gap is closed partially, small
        ones included, which is the case a band ignores entirely.
      */
      if (optimalTrading) {
        const rate = tradingRate({ ...TRADING, decay });
        const aim = to * aimWeight({ ...TRADING, decay });
        to = from + rate * (aim - from);
        delta = to - from;
        if (Math.abs(delta) / equity < 1e-5) continue;
      } else if (Math.abs(delta) / equity < band) continue;
      if (!(close[t][s] > 0)) continue;

      traded += Math.abs(delta);
      cash -= delta;
      if (to === 0) held.delete(s);
      else held.set(s, to);

      /*
        The same trade in shares, folded into the lot.

        Signs work for both directions: selling a long at above its average and
        covering a short at below its average both come out positive, because
        the realised term is `-dq * (price - avg)` and dq flips with the side.
      */
      const price = close[t][s];
      const dq = delta / price;
      const lot = lots.get(s) ?? { qty: 0, cost: 0, opened: dates[t] };
      if (lot.qty === 0) lot.opened = dates[t];

      if (lot.qty !== 0 && Math.sign(dq) !== Math.sign(lot.qty)) {
        const avg = lot.cost / lot.qty;
        // Never close more than is held; the remainder opens the other way.
        const reduce = Math.abs(dq) <= Math.abs(lot.qty) ? dq : -lot.qty;
        const gain = -reduce * (price - avg);
        lot.qty += reduce;
        lot.cost += reduce * avg;

        if (Math.abs(lot.qty) < 1e-9) {
          closed.push({
            symbol: symbols[s], opened: lot.opened, closed: dates[t],
            entry: +avg.toFixed(4), exit: +price.toFixed(4),
            /*
              In EQUITY UNITS, not dollars — the book starts at 1 and compounds,
              so a whole position is around 0.02 and rounding this to cents made
              every gain read as zero. The account page multiplies by the stake.
            */
            gain: +gain.toFixed(8),
            weight: +(Math.abs(reduce * price) / equity).toFixed(6),
            gainPct: +((price / avg - 1) * Math.sign(reduce === 0 ? 1 : -reduce)).toFixed(5),
          });
          lot.qty = 0; lot.cost = 0;
        }

        const rest = dq - reduce;
        if (rest !== 0) { lot.qty += rest; lot.cost += rest * price; lot.opened = dates[t]; }
      } else {
        lot.qty += dq;
        lot.cost += dq * price;
      }

      if (Math.abs(lot.qty) < 1e-9) lots.delete(s);
      else lots.set(s, lot);

      if (trades.length < 4000) {
        trades.push({
          date: dates[t], symbol: symbols[s],
          deltaWeight: +(delta / equity).toFixed(5),
          price: close[t][s],
          side: from === 0 ? 'open' : to === 0 ? 'close' : Math.abs(to) > Math.abs(from) ? 'add' : 'trim',
        });
      }
    }

    // Commission on what actually moved.
    cash -= (traded / equity) * (book.costBps / 10_000) * equity;
    tradedTotal += traded / equity;
    lastRebalance = t;

    const longs = [...held.values()].filter((v) => v > 0).length;
    const shorts = [...held.values()].filter((v) => v < 0).length;

    /*
      The BOOK itself, not just how many names were in it.

      Recorded as weights of equity at the moment of the rebalance, sorted
      largest first. The journal used to carry only counts, which answers "how
      concentrated" and not "in what" — and the second question is the one
      anybody actually asks of a strategy.
    */
    const positions = [...held.entries()]
      .filter(([, v]) => v !== 0)
      .map(([s, v]) => {
        const lot = lots.get(s);
        /*
          A name can be HELD on a day it did not print — a halt, or a gap in the
          source. The position is real and still marked at its last known value;
          only the quote is missing, so the price is reported as null rather
          than crashing the run.

          Surfaced by the daily cadence sweep, where every trading day is a
          rebalance and these gaps stop being skippable.
        */
        const price = close[t][s];
        const avg = lot && lot.qty ? lot.cost / lot.qty : null;
        return {
          symbol: symbols[s],
          weight: +(v / equity).toFixed(5),
          entry: avg ? +avg.toFixed(4) : null,
          price: price > 0 ? +price.toFixed(4) : null,
          since: lot ? lot.opened : dates[t],
        };
      })
      .sort((a, b) => Math.abs(b.weight) - Math.abs(a.weight));

    journal.push({
      positions,
      date: dates[t],
      exposure: +exposure.toFixed(3),
      reason: state.reason,
      longs, shorts,
      gross: +([...held.values()].reduce((s, v) => s + Math.abs(v), 0) / equity).toFixed(3),
      net: +([...held.values()].reduce((s, v) => s + v, 0) / equity).toFixed(3),
      turnover: +(traded / equity).toFixed(4),
      equity: +equity.toFixed(4),
    });
  }

  return { curve, spyCurve, journal, trades, closed, rebalances: journal.length, turnover: tradedTotal / (journal.length || 1) };
}

function stats(series) {
  const r = series.slice(1).map((v, i) => (series[i] > 0 ? v / series[i] - 1 : 0));
  const n = r.length;
  const m = r.reduce((a, b) => a + b, 0) / n;
  const sd = Math.sqrt(r.reduce((s, v) => s + (v - m) ** 2, 0) / (n - 1));
  let pk = -Infinity; let dd = 0;
  for (const v of series) { pk = Math.max(pk, v); dd = Math.max(dd, (pk - v) / pk); }
  const years = n / 252;
  return {
    total: series.at(-1) - 1,
    annual: series.at(-1) > 0 ? series.at(-1) ** (1 / years) - 1 : -1,
    vol: sd * Math.sqrt(252),
    sharpe: sd > 0 ? (m / sd) * Math.sqrt(252) : 0,
    maxDrawdown: dd,
  };
}

const sweep = process.argv.includes('--sweep');

/*
  A machine-readable mode, so a sweep can drive this without parsing a table
  meant for a person. `--json` prints one object and writes nothing — the
  concentration sweep runs ten of these and must not have each overwrite
  data/backtest.json with its own variant.
*/
const asJson = process.argv.includes('--json');
const flag = (name) => {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  if (!hit) return undefined;
  const raw = hit.slice(name.length + 3);
  return raw === 'Infinity' ? Infinity : Number(raw);
};
const bookOverrides = {};
for (const key of ['maxNames', 'maxLong', 'maxShort', 'longThreshold', 'shortThreshold']) {
  const v = flag(key);
  if (v !== undefined) bookOverrides[key] = v;
}

if (sweep) {
  /*
    One variable at a time, against the same tape.

    Sweeping is only honest when everything else is held still — and it is only
    possible at all because the models are cached. Each row below would have
    been a ninety-minute retrain.
  */
  const spy = stats(run({}).spyCurve);
  console.log(`\nSPY over the same window: ${pct(spy.annual)} a year, Sharpe ${spy.sharpe.toFixed(2)}, maxDD ${pct(spy.maxDrawdown)}\n`);

  const cases = [
    ['baseline (last night)', { band: 0, exposureFloor: 0, shortsRequireRiskOff: false }],
    ['+ no-trade band 0.5%', { band: 0.005, exposureFloor: 0, shortsRequireRiskOff: false }],
    ['+ exposure floor 0.25', { band: 0.005, exposureFloor: 0.25, shortsRequireRiskOff: false }],
    ['+ shorts gated', { band: 0.005, exposureFloor: 0.25, shortsRequireRiskOff: true }],
    ['band 0.25%', { band: 0.0025 }],
    ['band 1%', { band: 0.01 }],
    ['band 2%', { band: 0.02 }],
    ['floor 0.4', { exposureFloor: 0.4 }],
    ['floor 0.6', { exposureFloor: 0.6 }],
    ['monthly instead of weekly', { rebalanceEvery: 21 }],
    ['daily + band 1%', { rebalanceEvery: 1, band: 0.01 }],
  ];

  console.log('configuration                  ann      vs SPY    vol   sharpe    maxDD   turnover  trades/rb');
  console.log('-'.repeat(96));
  for (const [label, opts] of cases) {
    const r = run(opts);
    const s = stats(r.curve);
    console.log(
      `${label.padEnd(28)} ${pct(s.annual).padStart(8)} ${pct(s.annual - spy.annual).padStart(9)}` +
      ` ${pct(s.vol).padStart(7)} ${s.sharpe.toFixed(2).padStart(7)} ${pct(s.maxDrawdown).padStart(8)}` +
      ` ${pct(r.turnover).padStart(9)} ${String(Math.round(r.trades.length / Math.max(1, r.rebalances))).padStart(9)}`,
    );
  }
  console.log('\nturnover is per rebalance; multiply by 52 for weekly, 12 for monthly, 252 for daily');
} else if (asJson) {
  const runOpts = { book: { ...BOOK, ...bookOverrides } };
  const every = flag('rebalanceEvery');
  if (every !== undefined) runOpts.rebalanceEvery = every;
  const bandFlag = flag('band');
  if (bandFlag !== undefined) runOpts.band = bandFlag;
  const floorFlag = flag('exposureFloor');
  if (floorFlag !== undefined) runOpts.exposureFloor = floorFlag;
  if (process.argv.includes('--optimalTrading')) runOpts.optimalTrading = true;
  const decayFlag = flag('decay');
  if (decayFlag !== undefined) runOpts.decay = decayFlag;
  const r = run(runOpts);
  const me = stats(r.curve);
  const spy = stats(r.spyCurve);

  const byYear = new Map();
  dates.forEach((d, i) => {
    const y = d.slice(0, 4);
    if (!byYear.has(y)) byYear.set(y, { i0: i, i1: i });
    byYear.get(y).i1 = i;
  });
  let ahead = 0;
  for (const { i0, i1 } of byYear.values()) {
    if (r.curve[i1] / r.curve[i0] > r.spyCurve[i1] / r.spyCurve[i0]) ahead += 1;
  }

  const held = r.journal.map((j) => j.longs + j.shorts);
  console.log(JSON.stringify({
    strategy: me,
    spy,
    years: byYear.size,
    yearsAhead: ahead,
    rebalances: r.journal.length,
    avgHeld: Math.round(held.reduce((a, b) => a + b, 0) / held.length),
    turnover: +r.turnover.toFixed(4),
  }));
} else {
  const r = run({});
  const me = stats(r.curve);
  const spy = stats(r.spyCurve);

  console.log(`\n${dates[0]} .. ${dates.at(-1)}   ${r.rebalances} rebalances, ${r.trades.length} trades recorded`);
  console.log(`turnover ${pct(r.turnover)} per rebalance (${pct(r.turnover * 52)} a year)\n`);
  console.log('                      strategy        SPY');
  console.log('-'.repeat(46));
  for (const [label, k, f] of [
    ['total return', 'total', pct], ['annualised', 'annual', pct],
    ['volatility', 'vol', pct], ['Sharpe', 'sharpe', (v) => v.toFixed(2)],
    ['max drawdown', 'maxDrawdown', pct],
  ]) console.log(`${label.padEnd(20)} ${String(f(me[k])).padStart(10)} ${String(f(spy[k])).padStart(10)}`);
  console.log(`${'beat SPY by'.padEnd(20)} ${pct(me.annual - spy.annual).padStart(10)}  a year`);

  console.log('\nby year        strategy       SPY');
  console.log('-'.repeat(38));
  const byYear = new Map();
  dates.forEach((d, i) => {
    const y = Number(d.slice(0, 4));
    if (!byYear.has(y)) byYear.set(y, { i0: i, i1: i });
    byYear.get(y).i1 = i;
  });
  let losing = 0;
  for (const [y, { i0, i1 }] of byYear) {
    const a = r.curve[i1] / r.curve[i0] - 1;
    const b = r.spyCurve[i1] / r.spyCurve[i0] - 1;
    if (a < 0) losing++;
    console.log(`${y}      ${pct(a).padStart(11)} ${pct(b).padStart(10)}  ${a > b ? '+' : ''}`);
  }
  console.log(`\n${losing} losing year${losing === 1 ? '' : 's'} of ${byYear.size}`);

  const last = r.journal.at(-1);
  console.log(`\ncurrent book — ${last.date}: ${last.longs} long, ${last.shorts} short, gross ${last.gross}, net ${last.net}, exposure ${last.exposure}`);

  mkdirSync(dataDir, { recursive: true });
  /*
    The two universes are written side by side, never over each other. The
    point-in-time run is the honest one and the biased run is kept because the
    DIFFERENCE between them is the most useful number this project has.
  */
  writeFileSync(path.join(dataDir, pointInTime ? 'backtest-pit.json' : 'backtest.json'), JSON.stringify({
    generatedAt: new Date().toISOString(),
    start: dates[0], end: dates.at(-1),
    dates, curve: r.curve.map((v) => +v.toFixed(6)), spyCurve: r.spyCurve.map((v) => +v.toFixed(6)),
    metrics: { strategy: me, spy },
    journal: r.journal, trades: r.trades, closed: r.closed,
  }));
  console.log(`
wrote data/backtest${pointInTime ? '-pit' : ''}.json`);
}
