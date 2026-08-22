'use client';

/**
 * A credit book, and the one number that decides whether a lender survives it.
 *
 * ---
 *
 * WHY THE CORRELATION SLIDER IS THE WHOLE INSTRUMENT
 *
 * Everything else here is arithmetic a reader could do on paper: probability
 * times exposure times severity, summed. That number — the expected loss — is
 * priced into an interest rate and never surprises anybody.
 *
 * The slider changes only ONE thing: whether borrowers fail together. Nothing
 * about the accounts, the rates or the balances moves. And the capital the
 * lender must hold goes from about $130,000 to over $8,000,000 across its
 * range, on the same book.
 *
 * That is the entire subject in one control, and it is invisible in a
 * spreadsheet. It is the reason bank capital rules exist and the reason 2008
 * happened to people who had modelled their expected losses correctly.
 *
 * ---
 *
 * THE MEAN STAYING PUT IS THE PROOF
 *
 * As the slider moves, the average loss barely changes while the tail explodes.
 * That is not a coincidence to be admired — it is the √ρ and √(1−ρ) weighting
 * doing its job, and it is the reader's evidence that the control is honest.
 * If raising correlation also raised the average, the comparison would be
 * meaningless because two things would have changed at once.
 */

import { useDeferredValue, useMemo, useState } from 'react';
import {
  CARD_BOOK,
  bookExpectedLoss,
  expectedLoss,
  formatMoney,
  simulateBook,
  type Borrower,
} from '@/lib/credit';
import { formatPercent } from '@/lib/quant';
import { Reveal } from '@/components/motion/Reveal';

const SCENARIOS = 6_000;
const SEED = 20260822;

const W = 760;
const H = 240;
const PAD = { top: 18, right: 16, bottom: 30, left: 74 };

export function CreditInstrument() {
  const [rho, setRho] = useState(0.15);
  const [book, setBook] = useState<Borrower[]>(CARD_BOOK);

  // Deferred as primitives, never as an object — `useDeferredValue` on an
  // inline object is an infinite render loop.
  const dRho = useDeferredValue(rho);
  const dKey = useDeferredValue(book.map((b) => b.count).join(','));

  const current = useMemo(() => {
    const counts = dKey.split(',').map(Number);
    return CARD_BOOK.map((b, i) => ({ ...b, count: counts[i] ?? b.count }));
  }, [dKey]);

  const result = useMemo(
    () => simulateBook(current, { correlation: dRho, scenarios: SCENARIOS, seed: SEED }),
    [current, dRho],
  );

  const geom = useMemo(() => {
    const bins = result.histogram;
    const maxCount = Math.max(...bins.map((b) => b.count)) || 1;
    const lo = bins[0].x0;
    const hi = bins[bins.length - 1].x1;
    const x = (v: number) =>
      PAD.left + Math.max(0, Math.min(1, (v - lo) / (hi - lo || 1))) * (W - PAD.left - PAD.right);
    const h = (c: number) => (c / maxCount) * (H - PAD.top - PAD.bottom);
    return { bins, x, h };
  }, [result]);

  const accounts = current.reduce((s, b) => s + b.count, 0);
  const el = bookExpectedLoss(current);

  return (
    <div className="instrument credit">
      <Reveal className="instrument__head">
        <div>
          <span className="mono-label instrument__tag">Live · 6,000 simulated years</span>
          <h3 className="instrument__title">What a lender has to survive</h3>
          <p className="instrument__sub">
            A card book of {accounts.toLocaleString('en-CA')} accounts in three
            quality bands. Every figure below is computed from the three
            questions on the left.
          </p>
        </div>
      </Reveal>

      {/* ---- the book ---- */}
      <div className="credit__book">
        <div className="credit__head mono-label">
          <span>Band</span>
          <span>Will they default?</span>
          <span>Owed when they do</span>
          <span>Never recovered</span>
          <span>Accounts</span>
        </div>
        {current.map((b, i) => (
          <label className="credit__row" key={b.id}>
            <span className="credit__band">
              <strong>{b.label}</strong>
              <em>{formatMoney(expectedLoss(b) * b.count)} expected</em>
            </span>
            <span className="credit__fig">{formatPercent(b.pd, 1)}</span>
            <span className="credit__fig">{formatMoney(b.ead)}</span>
            <span className="credit__fig">{formatPercent(b.lgd, 0)}</span>
            <span className="credit__count">
              <input
                type="range"
                min={0}
                max={8000}
                step={100}
                value={b.count}
                onChange={(e) => {
                  const next = [...book];
                  next[i] = { ...next[i], count: Number(e.target.value) };
                  setBook(next);
                }}
                aria-label={`${b.label} accounts`}
                aria-valuetext={`${b.count} accounts`}
              />
              <output>{b.count.toLocaleString('en-CA')}</output>
            </span>
          </label>
        ))}
      </div>

      <p className="instrument__plain">
        Expected loss on this book is{' '}
        <strong>{formatMoney(el)}</strong> a year. That is a cost, not a risk —
        it goes into the interest rate like any other. What follows is the part
        no price can absorb.
      </p>

      {/* ---- the control that matters ---- */}
      <div className="credit__control">
        <label>
          <span className="mono-label">
            How much borrowers fail together — correlation
          </span>
          <input
            type="range"
            min={0}
            max={0.4}
            step={0.01}
            value={rho}
            onChange={(e) => setRho(Number(e.target.value))}
            aria-valuetext={`${(rho * 100).toFixed(0)} percent`}
          />
          <output>{rho.toFixed(2)}</output>
        </label>
        <p className="credit__hint">
          At <strong>0</strong> every borrower fails for their own private
          reasons. At <strong>0.4</strong> most of what happens to one happens to
          all of them. Regulators assume roughly <strong>0.04</strong> for
          revolving retail credit and far more for corporate lending.
        </p>
      </div>

      {/* ---- the distribution ---- */}
      <figure className="instrument__figure">
        <figcaption className="mono-label">
          {SCENARIOS.toLocaleString('en-CA')} possible years — the long tail on
          the right is what capital is for
        </figcaption>
        <svg viewBox={`0 0 ${W} ${H}`} className="instrument__svg" role="img"
             aria-label="Distribution of simulated annual losses, with the expected loss and the one-in-a-thousand year marked">
          {geom.bins.map((b, i) => {
            const inTail = b.x0 >= result.worstIn100;
            const bx = geom.x(b.x0);
            const bw = Math.max(1, geom.x(b.x1) - bx - 1);
            const bh = geom.h(b.count);
            return (
              <rect key={i} x={bx} y={H - PAD.bottom - bh} width={bw} height={bh}
                    className={inTail ? 'instrument__bar instrument__bar--tail' : 'instrument__bar'} />
            );
          })}

          <line x1={geom.x(el)} y1={PAD.top} x2={geom.x(el)} y2={H - PAD.bottom}
                className="instrument__baseline" />
          <text x={geom.x(el)} y={PAD.top - 4} className="instrument__axis" textAnchor="middle">
            expected
          </text>

          <line x1={geom.x(result.worstIn1000)} y1={PAD.top}
                x2={geom.x(result.worstIn1000)} y2={H - PAD.bottom}
                className="instrument__marker" />
          <text x={geom.x(result.worstIn1000) - 6} y={PAD.top + 12}
                className="instrument__axis instrument__axis--accent" textAnchor="end">
            1 in 1,000
          </text>
        </svg>
      </figure>

      <dl className="instrument__readout">
        <Readout label="Expected loss" value={formatMoney(result.expected)}
                 note="Priced into the rate" />
        <Readout label="Bad year · 1 in 100" value={formatMoney(result.worstIn100)}
                 note="Uncomfortable" />
        <Readout label="Bad year · 1 in 1,000" value={formatMoney(result.worstIn1000)}
                 note="What capital must cover" strong />
        <Readout label="Capital required" value={formatMoney(result.capital)}
                 note="Above the expected loss" strong />
        <Readout label="Times the expected"
                 value={`${(result.worstIn1000 / (result.expected || 1)).toFixed(1)}×`}
                 note="How much worse it gets" />
        <Readout label="Years worse than average"
                 value={formatPercent(result.worseThanExpected)}
                 note="Losses are not symmetric" />
      </dl>

      <p className="instrument__caveat">
        <strong>Drag the correlation and watch two things.</strong> The expected
        loss barely moves — that is the model behaving correctly, since
        correlation changes when borrowers fail, not how often. And the capital
        required climbs by a factor of fifty across the range. Same accounts,
        same rates, same balances. Only the assumption that they are connected.
      </p>
      <p className="instrument__caveat instrument__caveat--quiet">
        A one-factor model with fixed correlation, which is the shape the Basel
        framework uses and a simplification of reality in the direction that
        flatters. Real correlation varies by sector and vintage, and rises
        further in a crisis than any constant allows — so a genuine one-in-a-
        thousand year is worse than this shows. The figures are illustrative on
        a plausible structure, not any lender&rsquo;s actual book.
      </p>
    </div>
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
