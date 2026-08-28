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

**Point-in-time membership is recoverable after all, and it was measured.**

Every note in this repo said historical S&P 500 membership could not be
recovered and that the weekly `archive/constituents/` snapshots were the only
fix, working forward from August 2026. That was wrong: the constituents list we
already fetch lives in a git repository, and reading it at each commit gives
**110 distinct membership states between 2012-12-27 and 2026-08-19** — the whole
backtest, not the three years going forward.

`npm run membership` builds it in twenty seconds. `npm run survivorship`
measures against it in two.

| | measured |
|---|---|
| IC, full universe | **+0.0214** |
| IC, index members on the day | **+0.0185** |
| Cost of the additions bias | **-13.6%** |
| Name-days dropped by dating membership | 22.1% |
| Days with positive IC | 57.7% -> 54.1% |

The full-universe figure reproduces the +0.0214 recorded independently below,
which is the check that the IC computation is right.

### The -69% was measuring something else

An earlier run put the cost at **-69%** (+0.0183 -> +0.0057) and that number led
this file for weeks. Its script was never committed, so it cannot be re-derived
— but the difference is explicable rather than mysterious, and both numbers can
be true:

- **-13.6%** holds the model FIXED and changes only which names it is graded on.
  It answers: of the skill we measured, how much came from scoring companies
  that were not in the index yet?
- **-69%** came from CPCV arrangements that also RETRAINED on the filtered data.
  It answers: what would this be worth if it had been built point-in-time from
  the start? That carries the cost of 20% fewer training rows on top.

The second question is the one that matters for whether the strategy is real,
and it is **still open** — it needs a retrain, which is exactly what the tape
cannot shortcut. Until then the site quotes the reproducible number and says
what it covers.

**Both are floors.** Dating membership removes companies that had not joined
yet; it cannot recover the ones dropped after failing, because their prices were
never fetched. At 2013 only 279 of the index's 500 names exist in the tape at
all, which is the bias made visible.

### The biased run, kept for comparison

| | measured |
|---|---|
| Out-of-sample IC, price-only | +0.0215, t 12.2, 12/14 years positive |
| Out-of-sample IC, + fundamentals | +0.0173 (worse) |
| Out-of-sample IC, + fundamentals + macro | +0.0214 (tie with price-only) |
| Backtest vs SPY | 22.40% vs 14.85% |
| Sharpe | 1.20 vs 0.91 (deflates to ~1.00 after selection) |
| Max drawdown | 22.51% vs SPY 33.72% |
| Years beating SPY | 11 of 14 |
| 2018 | +7.36% while SPY was -5.25% |

**Read the block above as fiction, not as a result.** It was built on a model
with roughly three times the skill it actually has. It is shown on `/lab` with
that correction directly under the headline rather than in a footnote, and it is
kept here for the same reason: the gap between the two tables is the most useful
thing this project has measured.

Construction, not prediction, was the problem in the biased run. Three fixes
moved it from -2.92% to +1.46% against SPY with the model untouched; monthly
rebalancing took it to +7.55%. Whether any of that survives on the honest signal
is untested.

---|---|
| Out-of-sample IC, price-only | **+0.0215**, t 12.2, 12/14 years positive |
| Out-of-sample IC, + fundamentals | +0.0173 (worse) |
| Out-of-sample IC, + fundamentals + macro | +0.0214 (tie with price-only) |
| Backtest vs SPY | **22.40% vs 14.85% — ahead by 7.55%/yr** |
| Sharpe | **1.20 vs 0.91** (deflates to ~1.00 after selection) |
| Max drawdown | **22.51% vs SPY 33.72%** |
| Years beating SPY | **11 of 14**; 2 losing years |
| 2018 | **+7.36% while SPY was -5.25%** |

Construction, not prediction, was the problem. Three fixes moved it from -2.92%
to +1.46% against SPY with the model untouched; monthly rebalancing took it to
+7.55%.

**Read with two caveats.** Sharpe 1.20 deflates to 1.00 once corrected for
having tried eleven configurations — 0.198 of it is pure selection. And
survivorship is still unquantified: the universe is today's 503 names, so every
company that failed is absent, and that flatters a long book by an unknown
amount. It is the largest unmeasured risk to this result.

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

- [x] **Prediction tape** — 3,431 days, 1.6M scores, 38.6 MB. Construction is
      now tunable without retraining.
- [x] **No-trade band swept.** 0.5% recovered +1.97 points against SPY.
- [x] **Exposure floor swept.** 0.25 added +0.35.
- [x] **Regime-gated shorts validated.** +2.06 points and turnover from 81% to
      56% — carrying 26 permanent shorts through a bull market was expensive.
- [x] **Deflated Sharpe applied to our own sweep.** E[max Sharpe] under no skill
      across 11 trials is 0.198, so 1.20 is honestly 1.00. Returns are fat
      tailed (kurtosis 7.02) and negatively skewed (-0.371), which is why
      normality-based methods stay off the list.
- [ ] **Test the horizon-matching hypothesis.** Monthly rebalancing was
      justified by matching the 21-day label, and that argument is sound — but
      it was found by sweeping, not derived first, which makes it post-hoc until
      tested. Falsifiable: retrain with a 5-day label and weekly should become
      optimal; a 63-day label should favour quarterly. If monthly wins
      regardless of the label, the story was fitted to the number and we say so.
- [x] **Tree cap and learning rate — TESTED AND REJECTED.** Seven configurations
      on the 2022 fold (400-2000 trees, rates 0.030-0.008, depths 4-8, a 4.4x
      spread in runtime). Total spread in out-of-sample IC: **0.0030**. Given
      1000 trees the model stops at 426 on its own, so the cap was binding by 26
      rounds, not hundreds. **Capacity is not the constraint and the earlier
      claim that results were "a floor" was wrong.**

      The experiment found something more useful than it went looking for:
      **Spearman rho between validation MSE and test IC is -0.036.** Our
      selection criterion carries no information about out-of-sample
      performance. The config with the best validation MSE had the second-worst
      test IC — the textbook signature of fitting the validation split.

      The cause is structural. Validation is the last 15% of training
      CHRONOLOGICALLY, so on the 2022 fold it tunes on 2021 and then trades
      2022. We select models on the wrong regime. This is the same disease as
      macro helping in 2018/2020/2021 and hurting in 2022, and fundamentals
      helping only in volatile years: **the model has no notion of which regime
      it is in, and neither does the procedure that picks it.**

      Consequence: CPCV and regime-conditional weighting move UP the list;
      hyperparameter work moves off it.
- [x] **Survivorship measured reproducibly.** `scripts/fetch-membership.mjs`
      recovers 110 membership states from the constituents repo's git history;
      `scripts/verify-survivorship.mjs` scores the tape against them. -13.6% on
      a fixed model. The end-to-end version needs a retrain and is open.
- [ ] **Point-in-time RETRAIN.** The open half of the survivorship question:
      train on membership-filtered rows rather than only grading on them. This
      is what the -69% was reaching for and the only way to settle it.
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
- [x] **The instrument UI — BUILT.** Its own page at `/book`, presented as a brokerage account. Equity curve against SPY on a
      log axis, drawdown view, the exact metrics, and fourteen calendar years
      with the excess column. Fed by `public/data/engine.json` (47 KB) built
      from `data/backtest.json` by `npm run instrument` — the tape is 38 MB and
      the backtest half a megabyte, so neither ships.

      The survivorship correction sits DIRECTLY UNDER the headline metrics
      rather than at the foot of the page. A reader who stops after 22.40%
      should still stop with the truth.
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

## Settled by measurement

- [x] **Regime-conditional weighting — HYPOTHESIS REJECTED.** Fifteen CPCV
      arrangements, each holding out a different mix of conditions.
      corr(IC, market volatility) = **0.152**; corr(IC, share below the 200d) =
      **-0.091**. At n=15 the 5% critical value is ~0.514, so neither is close.

      The three findings that motivated it — macro helping in 2018/2020/2021 and
      hurting in 2022, fundamentals helping only in volatile years, and model
      selection failing on a regime break — were **coincidence**. Three
      observations assembled into a story. The test was built to be able to say
      that and it did.

- [x] **CPCV built and structurally verified.** 15 splits, zero days on both
      sides, zero training labels reaching a test group, closest approach 22
      days (horizon + 1). Mean IC across arrangements **+0.0183**, sd 0.0147,
      14 of 15 positive — a more honest statement of skill than one calendar cut.

## THE FINDING THAT MATTERS: skill is concentrated in the early sample

      period        mean IC (n=5 each)
      ~2010-12         +0.0229
      ~2012-15         +0.0160
      ~2015-18         +0.0248
      ~2018-21         +0.0305   peak
      ~2021-23         +0.0092
      ~2023-26         +0.0065   lowest

      splits testing only 2010-2021   +0.0296
      splits including 2021-2026      +0.0108
      corr(period index, mean IC)     -0.550

**The recent third carries 33% of the earlier skill**, and the only negative
split in the whole set is the one testing 2021-2026 exclusively.

Two explanations, opposite implications, not yet separated:

1. **Alpha decay.** Momentum, low-volatility and liquidity effects have been
   published for decades and traded hard. If so, the fix is NEW information.
2. **Survivorship bias wearing off.** The universe is today's 503 names, so 2010
   carries sixteen years of hindsight and 2025 carries one. The early years
   should be systematically flattered, and what looks like decay may be the bias
   dissolving. **If this is the cause, +0.0078 is the honest number and +0.0215
   was never real.**

- [x] **SEPARATED — and it was mostly BIAS.** Same 15 splits, membership applied
      as of each row's own date (20.2% of rows dropped).

      period      biased    point-in-time   change   % already members
      ~2010-12   +0.0229      +0.0060        -74%          53%
      ~2012-15   +0.0160      +0.0032        -80%          59%
      ~2015-18   +0.0248      +0.0119        -52%          63%
      ~2018-21   +0.0305      +0.0123        -60%          74%
      ~2021-23   +0.0092      +0.0049        -47%          83%
      ~2023-26   +0.0065      -0.0038       -159%          97%
      overall    +0.0183      +0.0057        -69%
      positive    14/15        11/15

      **Mean IC falls 69%.** The mechanism is confirmed rather than assumed:
      corr(IC lost, hindsight carried) = **0.544** — the periods trading the
      most not-yet-members lost the most skill.

      **+0.0057 is marginal.** Published equity models run 0.02-0.06; we are
      below that range by a factor of three. The most recent period is NEGATIVE.

      **The 22.40% vs SPY backtest is substantially fiction** — built on a model
      with roughly three times the skill it actually has. The deflated Sharpe
      correction applied to it was addressing the wrong problem.

      Still a LOWER BOUND: removes additions, cannot recover companies dropped
      from the index that later failed. The real bias is larger.
- [ ] **Test recency weighting in training.** If relationships have changed,
      sixteen years of equal-weighted history is dragging the model toward
      regimes that no longer exist. Cheap to test: exponential sample weights,
      or a shorter rolling training window.

Both readings point the same way: **the headline IC overstates what this model
would do tomorrow, and the way out is information the market has not already
priced.** That moves the untouched data families from "nice to have" to the
main event.

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
