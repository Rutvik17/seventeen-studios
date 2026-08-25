# Engine TODO

Working state of the trading engine. **Update this as things land** — mark items
done, add research questions as they surface, and record what was measured
rather than what was intended.

Goal: an ML trading system that selects from the S&P 500, takes real positions,
and beats **SPY at 100%** — the actual cap-weighted index, however concentrated.
Not equal-weighted, not beta-matched, not a cash blend.

Last updated: 2026-08-25

---

## Where it stands

| | measured |
|---|---|
| Out-of-sample IC, price-only | **+0.0215**, t 12.2, 12/14 years positive |
| Out-of-sample IC, + fundamentals | +0.0173 (worse) |
| Out-of-sample IC, + fundamentals + macro | +0.0214 (tie with price-only) |
| Backtest vs SPY | 12.30% vs 14.85% — **behind by 2.55%/yr** |
| Backtest max drawdown | **24.96% vs SPY 33.72%** — the one clear win |
| Turnover | 71%/rebalance = **3.7%/yr in costs** |

**The gap to SPY is smaller than the cost drag.** Gross of costs the strategy is
roughly +1.2% ahead. That makes turnover the headline problem, not prediction.

---

## Done

- [x] 16y daily bars, 503 names + SPY (1.99M bars). `range=max` silently returns
      MONTHLY data — explicit timestamps required.
- [x] Technical features (20 columns), all causal, rolling O(n), verified equal
      to naive implementations to 2.3e-14
- [x] SEC fundamentals via XBRL frames (26 columns, 282k point-in-time facts).
      Frames omits `filed`, so availability is derived from the filing deadline —
      conservative, never early.
- [x] Macro (23 columns): curve, credit, VIX complex, commodities, FOMC.
      Exempt from rank-normalisation or they flatten to constants and vanish.
- [x] Gradient-boosted trees in TypeScript, histogram-based, missing-value aware
- [x] Walk-forward with a 21-day embargo; date-cut splits, never random rows
- [x] Book construction: conviction sizing, inverse-vol within side, asymmetric
      short gating
- [x] Risk engine: volatility targeting, trend, drawdown circuit breaker
- [x] **Backtest run end to end** — returns vs SPY, year by year, trade journal
- [x] Append-only archive, plain CSV partitioned by year, idempotent
- [x] Nightly cron with `contents: write` to push the archive
- [x] **Illiquidity look-ahead fixed** — dollar volume was using the
      dividend-adjusted close, whose adjustment factor summarises the future
- [x] **Position drift fixed** — the book held static weights between
      rebalances, silently rebalancing to target daily for free
- [x] predict/backtest split so construction can be swept without retraining

---

## Now

- [ ] **Generate the prediction tape** — running, ~70 min, one time
- [ ] **Sweep the no-trade band** (0.25% / 0.5% / 1% / 2%). Expected to recover
      most of the 3.7% cost drag. Highest-impact item on this list.
- [ ] **Sweep the exposure floor** (0.25 / 0.4 / 0.6). Three dampeners multiply
      and compounded to 0.05 — five percent invested.
- [ ] **Validate regime-gated shorts** against always-on (26 shorts were carried
      on average through a 14-year bull market)
- [ ] **Raise the tree cap, cut the learning rate.** Binding on five folds —
      2019 → 399, 2022 → 400, 2024 → 400. Current results are a floor.
- [ ] **Clean re-run of the 3-way IC comparison** on the fixed prices, to see how
      much of the +0.0215 the illiquidity leak was doing

---

## Data families not yet built

- [ ] **13F institutional flows.** Ownership change per stock — who is
      accumulating, who is exiting. Parse verified against NVDA's own filing.
      The fetch is the hard part: thousands of institutions file quarterly and
      it must be aggregated *by holding*, not by filer.
- [ ] **Form 4 insider transactions.** Buy/sell clusters, net insider buying,
      officer vs director weighting. Partially verified — owner and title parse
      cleanly; the transaction amounts sit in a nested `<value>` path, and the
      first filing sampled had no transaction block at all, so sampling several
      is required.
- [ ] **Earnings text / NLP.** Verified available: 20,665 chars of NVDA's
      release plus 162 KB of CFO commentary, on EDGAR as 8-K item 2.02
      exhibits — the same text companies put on their IR site, uniformly, with
      filing timestamps. Features: guidance direction, tone shift versus the
      same company's prior release, hedging language.
- [ ] **The circular-financing graph.** Both inputs verified — NVDA's 13F shows
      $63.4B in Intel / SpaceX / CoreWeave / Coherent / Synopsys, and full-text
      search returns 71 CoreWeave mentions in 10-Ks. The most distinctive thing
      in the spec and the least standard.
- [ ] **Election / political calendar.** Trivial — midterms and presidentials
      are a fixed known list, same treatment as FOMC proximity.

### Blocked

- [ ] **Options: gamma, theta, dealer positioning.** No free historical source
      found. CBOE returns 403; Yahoo's chains are current-snapshot only. Current
      -day gamma is obtainable; sixteen years of it for backtesting may not be
      free. **Needs a decision: pay for data, or drop from v1.**
- [ ] **Revised macro statistics** (NFP, CPI, PPI, GDP). Needs a free FRED API
      key — two minutes to register. Without it only never-revised market prices
      are usable, because `fredgraph.csv` silently ignores `vintage_date` and
      serves revised data, which is look-ahead.

---

## System pieces

- [ ] **Daily monitoring with threshold rebalancing.** The band is implemented;
      the daily-vs-weekly comparison is not run. Compute is not the constraint —
      training is annual and prediction is milliseconds. Costs and signal decay
      are.
- [ ] **Confidence estimates.** The model emits point predictions only. Sizing
      "small when unsure" is currently rhetoric. Needs ensemble variance across
      seeds, or quantile objectives.
- [ ] **Feature selection within families.** Fundamentals cost 0.0042 of IC when
      all 26 were admitted at once. Prune to the columns that individually earn
      their place rather than admitting or rejecting a family wholesale.
- [ ] **The instrument UI.** Nothing exists for the new engine. Equity curve vs
      SPY, current holdings and weights, the trade journal, feature importances.
      Last, once there is a result worth rendering.

---

## Mathematical programme

Real methods with a specific problem each. Ordered so that nothing sophisticated
gets built on top of something broken — maths multiplies an edge, it does not
create one, and it cannot outrun a leak.

- [ ] **Deflated Sharpe ratio** (Bailey & Lopez de Prado). Corrects for multiple
      testing: sweep eleven configurations and the winner is flattered by
      selection. There is a formula for how much. **Apply it to our own sweep
      before believing the result** — this is the Markopolos discipline pointed
      at ourselves rather than at somebody else's fund.
- [ ] **Garleanu-Pedersen optimal trading.** With decaying alpha and quadratic
      costs, the optimal policy is neither trade-to-target nor a no-trade band —
      it is to move a constant fraction toward a weighted average of current and
      future targets. Closed form, and it replaces the heuristic band directly.
      The most applicable piece of real mathematics on this list, because
      turnover is our measured problem.
- [ ] **Random matrix theory for the covariance.** Marchenko-Pastur says which
      eigenvalues of a sample covariance are indistinguishable from noise at a
      given sample size. Estimating 500x500 from 250 observations is exactly
      that regime. Ledoit-Wolf shrinkage is the blunt instrument; eigenvalue
      clipping is the sharp one.
- [ ] **Regime-conditional model averaging.** Macro helps in volatile years and
      hurts in calm ones — that is a mixture-of-experts problem, not a feature
      selection problem. Hidden Markov regime states, or Bayesian model
      averaging where each family's weight is a function of the regime.
- [ ] **Conformal prediction for confidence.** Distribution-free prediction
      intervals with finite-sample coverage. Returns are not normal, so an
      interval that assumes they are is decoration.
- [ ] **Combinatorial purged cross-validation.** Our 21-day embargo is the
      simple version; CPCV is the rigorous one and gives a distribution of
      backtest outcomes rather than a single path.

### Methods deliberately NOT adopted, and why

Sophistication that hides an assumption is more dangerous than a simple method
that exposes one. LTCM had two Nobel laureates. The Gaussian copula was elegant
and assumed away tail correlation. Black-Scholes assumes lognormal returns in a
market with fat tails.

- **Gaussian copulas / normality anywhere it matters.** Equity returns have fat
  tails and correlations that rise precisely when they are least welcome.
- **Continuous-time stochastic calculus for selection.** Genuinely required for
  derivatives pricing; the cross-sectional problem here is discrete and
  statistical, and Ito would be costume rather than content.

---

## Research questions

Open problems, not tasks. Each needs thinking before it needs code.

- **Why do fundamentals and macro help in volatile years and hurt in calm ones?**
  Macro rescued 2021 (−0.0090 → +0.0223) and helped 2018 and 2020, but hurt
  2022 — the actual bear market. Both families cost value in 2013, 2016, 2023,
  2025. If the model could tell which regime it was in, it could tell which
  features to trust.
- **Separate fast and slow models, blended?** Technicals move daily;
  fundamentals move quarterly. One flat 68-column panel asks a single model to
  learn both clocks. A fast model and a slow model with a learned blend weight
  is the obvious alternative and has its own overfitting risk.
- **Is the 21-day horizon right?** Chosen to match a monthly rebalance. Never
  tested against 5, 10 or 63 days. Fundamentals may need a longer horizon to
  express anything at all.
- **Transaction costs are modelled flat at 10bps.** Real impact scales with
  position size and inversely with liquidity. A book concentrated in small,
  illiquid names would be flattered by a flat rate.
- **Survivorship is still unfixed and unquantified.** The universe is today's
  503. The archive now snapshots membership weekly, so this becomes fixable
  going forward — but not retroactively, and the size of the current flattery
  is unknown.
- **Today's GICS is applied to all sixteen years.** A company reclassified in
  2020 carries its 2026 sector back to 2010. Minor, real, and fixable from the
  membership snapshots once they accumulate.
- **The filing-deadline rule assumes companies file on time.** A genuinely late
  filer would have its numbers used before it published them. Bounded but real.
- **2023–2025 is where the backtest bled** (+1.01% vs +26.71%, +9.34% vs
  +25.59%, −0.00% vs +18.01%). Three straight years of being too defensive in a
  market that only went up. Is that the exposure floor, the shorts, or the
  model? The sweep should separate them.
