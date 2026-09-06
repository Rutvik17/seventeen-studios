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
- [x] **Horizon-matching — CONFIRMED, on both universes.** `npm run cadence`,
      20 configurations of cadence x no-trade band, no retraining.

          cadence      best band   annual   Sharpe   vs SPY   (point-in-time)
          monthly           1.0%    17.7%     1.01    +2.9%
          weekly            2.0%    13.9%     0.87    -0.9%
          fortnightly       2.0%    14.5%     0.86    -0.4%
          daily             2.0%    14.5%     0.82    -0.3%
          quarterly         0.0%    12.3%     0.64    -2.6%

      **Monthly wins and is the only cadence that beats SPY at all.** The
      ranking is IDENTICAL on the survivorship-biased universe, which matters:
      the concentration sweep's biased answer inverted point-in-time, and this
      one does not.

      It is not "slower is better" — quarterly is the worst of the five. It is
      specifically 21 days, which is the label the model was trained on. The
      original justification was found by sweeping and therefore post-hoc; it
      now survives a test designed to break it.

      Sweeping cadence at a fixed band would have answered the wrong question.
      Daily with a wide band and monthly with none are different strategies, not
      one strategy at two speeds — daily needs a 2% band to be tolerable at all
      and still loses.

- [x] **Daily monitoring — ANSWERED by the same sweep, and it is worse.** Daily
      rebalancing returns 3.9% with no band and 14.5% with a wide one, against
      monthly's 17.7%. The band cannot rescue it: reacting to a 21-day forecast
      every day is churn, and the cost shows up as Sharpe rather than as
      turnover, which is the part that would have been missed by looking at
      trading costs alone.
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
- [x] **Concentration swept — AND THE CONCENTRATED BOOK LOSES.** `npm run
      concentration`, ten configurations, ten seconds, no retrain.

          names   annual   Sharpe    maxDD   vs SPY   yrs ahead
              8    14.6%     0.80    34.2%    -0.2%      6/14
             12    14.4%     0.81    32.8%    -0.4%      6/14
             15    17.5%     0.92    30.7%    +2.7%      9/14
             20    21.3%     1.09    28.1%    +6.4%     10/14
             25    23.1%     1.16    26.6%    +8.3%     10/14
             30    22.3%     1.14    26.4%    +7.5%     10/14
             50    20.8%     1.10    26.6%    +5.9%     11/14
             75    21.6%     1.16    24.3%    +6.7%     12/14
            all    22.4%     1.20    22.5%    +7.6%     11/14

      **An eight-name book does not beat the index.** It returns 14.6% against
      SPY's 14.8%, with a WORSE drawdown, and it is ahead in six years of
      fourteen. Twelve names is the same. The tail the concentration argument
      wants to cut is carrying the result.

      **25 names is the return peak** (+8.3% over SPY, against +7.6% for the
      full book) but pays for it: Sharpe 1.16 against 1.20 and a drawdown four
      points deeper. Risk-adjusted, the diversified book is still the best one
      here.

      The reason is the IC. At +0.019 the model's ranking is right slightly more
      often than chance, so the top eight names are not reliably the best eight
      — they are the eight with the highest scores, which at that IC is mostly
      noise. Grinold's IR ~ IC x sqrt(breadth) is the same statement: a thin
      edge NEEDS breadth, and concentration is a bet on conviction this model
      does not have.

      **So concentration is downstream of signal quality, not a free choice.**
      The way to earn a fifteen-name book is a better IC, which is the argument
      for the unbuilt data families rather than for re-weighting what exists.
      `maxNames` is now a real lever in `BOOK` so this stays one command away
      after any retrain.

- [x] **The concentration curve holds point-in-time, and gets STEEPER.**
      `npm run concentration -- --pointInTime`. Selection is gated to names that
      were index members on the day; the model is not retrained.

          names      biased          point-in-time
                  annual  vs SPY    annual  vs SPY
              8    14.6%   -0.2%      8.5%   -6.4%
             12    14.4%   -0.4%      9.3%   -5.5%
             15    17.5%   +2.7%     13.1%   -1.8%
             20    21.3%   +6.4%     15.3%   +0.4%
             25    23.1%   +8.3%     14.5%   -0.3%
             50    20.8%   +5.9%     15.8%   +0.9%
             75    21.6%   +6.7%     16.0%   +1.1%
            all    22.4%   +7.6%     15.8%   +1.0%

      Two findings, and the second is the bigger one.

      **Concentration is worse, not better, once the universe is honest.** An
      eight-name book loses to SPY by 6.4 points a year. The biased sweep's
      "25 names is the peak" was itself an artifact — point-in-time the peak
      moves out to 75 and the curve is close to monotonic in breadth.

      **The whole edge is about one point a year, not seven and a half.**
      $10,000 becomes **$73,933** point-in-time against SPY's $65,820, where the
      biased run claimed $156,646. Sharpe 0.97 against SPY's 0.91, ahead in 8
      years of 14 rather than 11.

      Survivorship cost -13.6% of IC and roughly **87% of the excess return**.
      Construction amplifies the bias, because the names that later joined the
      index are exactly the ones that had already gone up.

      `/book` now ships the point-in-time run and states the biased figure
      beside it, since the gap is the most useful number here.

- [x] **THE RUN IS WIRED AND READY.** `npm run train` now builds eight panels
      rather than three, and the three that matter did not exist before:

          technical only              baseline
          + SEC fundamentals          known: -0.0042
          + macro                     known: a wash
          + 13F ownership             NEW
          + Form 4 insiders           NEW
          + earnings language         NEW
          + all three SEC             NEW
          point-in-time training      NEW — the open survivorship half
          point-in-time + all SEC     NEW — both at once

      **The panel can now gate TRAINING on membership**, which it could not
      before. The backtest gated selection and that cost 87% of the excess
      return; this drops the 18.8% of rows belonging to names that were not
      index members on the day — close to the 20.2% the earlier CPCV run
      reported, which is a useful independent cross-check.

      **Each SEC family is added to the PRICE baseline, not stacked.**
      Fundamentals cost IC and macro was a wash, so stacking on top of them
      would measure new signal through two known-neutral filters and blame any
      shortfall on the wrong thing.

      **MEASURED COST OF THE RUN: about 6.5 hours, not 90 minutes.** One fold on
      the full point-in-time panel — 1.24M training rows, 42 features — takes
      212 seconds and stops at 258 rounds. Fourteen years across eight configs
      is 112 folds. The early years train on less data so that is an upper
      bound, but it is the right number to plan around.

- [ ] **Point-in-time RETRAIN.** The open half of the survivorship question:
      train on membership-filtered rows rather than only grading on them. This
      is what the -69% was reaching for and the only way to settle it.
- [ ] **Clean re-run of the 3-way IC comparison** on the fixed prices, to see how
      much of the +0.0215 the illiquidity leak was doing

---

## Data families not yet built

- [x] **13F institutional flows — FETCHED.** `npm run 13f`. 53 quarters,
      2013q2 to mid-2026, in 3m25s. 1.3 MB.

      The fetch was called the hard part because thousands of institutions file
      quarterly and it has to be aggregated by HOLDING rather than by filer. The
      SEC already does that: one ZIP per quarter with every filer's positions in
      a single 378 MB INFOTABLE.tsv. The hard part was finding the URL. Read
      with a 90-line ZIP reader (`scripts/_zip.mjs`) rather than a dependency.

      **The join is on issuer NAME, because CUSIP-to-ticker is licensed.** 484
      of 503 match (96.2%); anything that does not match cleanly is DROPPED,
      because a missing quarter is a null the model handles and a wrong CUSIP is
      a lie about who owns a company.

      Two bugs found by checking the numbers rather than trusting them:

      **AON was Amazon and APA was Alphabet.** A-O-N is a subsequence of AMAZON
      and A-P-A of ALPHABET, and the abbreviation rule that correctly joins
      MATLS to MATERIALS has nothing to anchor it on a single-token name. Caught
      because AON showed $891B of institutional ownership against a $65B market
      cap. Single-token names now require an exact match, and coverage went UP
      (455 to 481 names) because the collisions stopped clobbering real entries.

      **VALUE is not comparable across the history.** The SEC switched from
      thousands to whole dollars, and the implied price per share reconciles on
      neither side. So features come from SHARES and HOLDERS — plain counts,
      unit-free, and a more direct statement of accumulation than a dollar total.

      Coverage rises with time: 353 names in 2013q2, 481 in 2026. Note that
      institutional shares can exceed shares outstanding, because 13F
      double-counts positions where managers share discretion.

- [x] **13F re-keyed by REPORT PERIOD, and seven features written.**

      **The ZIP label was never the quarter.** `01mar2026-31may2026` is the
      window in which filings were RECEIVED — and that one file carries 41
      distinct report periods: 7,360 filings for the quarter ending 31 March
      plus stragglers reporting quarters as far back as 2022. Keying by file
      would have smeared four years of positions into one bucket and dated every
      one of them wrong. Now keyed on `PERIODOFREPORT` per submission: **53
      periods in window, 2013-03-31 to 2026-03-31**, every quarter-end month
      correct, coverage rising 351 to 483 names.

      **Availability is the statutory deadline, not the observed filing date.**
      The first instinct was to use the last filing received for a period. That
      is wrong by a mile: amendments for the quarter ending June 2024 arrived in
      May 2026, a lag of **698 days**, so waiting for the last one means the
      quarter never becomes usable. 17 CFR 240.13f-1 gives managers 45 days, so
      that is the rule — conservative in the right direction, since most filers
      land before it. Verified: on 1 April the newest usable quarter is
      December's; March's only opens on 15 May.

      Features in `src/lib/engine/institutional.ts`, all ratios so a mega-cap
      held by 10,000 managers and a mid-cap held by 400 are on one scale:
      holder change (1q, 2q, acceleration), share change (1q, 2q, acceleration),
      and crowding — shares per manager, which separates "the same crowd buying
      more" from "more managers each buying less".

- [x] **13F wired into the panel, and the join proved leak-free.**
      `options.institutional` builds seven columns alongside the fundamentals,
      on the calendar axis and rankable — ownership change varies across names
      on a given day, so ranking it cross-sectionally means something, where
      ranking macro would flatten it to a constant.

      `npm run 13f:verify` walks 5 symbols x 7 columns over 181 days and finds
      every date a value MOVES. All 56 land on a statutory availability date.

      **The first version of that test was worthless and said PASS.** It
      compared the change dates against `available13f()` — the function it was
      meant to be testing — so setting the lag to zero made the features leak by
      45 days and the test still passed, because both sides moved together. The
      expectation is now restated independently from 17 CFR 240.13f-1, and the
      same sabotage now fails on 53 periods with the disagreement named.

- [ ] **Retrain with 13F.** The panel builds the columns; the shipped model was
      trained without them. Until a retrain, the features are reachable and
      unused.
- [x] **Form 4 insider transactions — FETCHED, FEATURED, WIRED.** `npm run
      form4`. 573,474 symbol-days, 2012 to 2026, in 53 seconds. The nested XML
      the note worried about was never needed: the SEC publishes bulk
      Form 3/4/5 datasets as TSV, and `SUBMISSION.tsv` carries
      ISSUERTRADINGSYMBOL and FILING_DATE — so no CUSIP join, no fuzzy matching,
      and availability is a fact in the file rather than a statute to compute.

      **Most transactions are not decisions.** The most common code is F, shares
      withheld to pay tax on a vesting grant (27,002 in one quarter), then A,
      the grant itself (24,635). Neither is a view about anything. Only P and S
      are open-market trades with the insider's own money, and only those are
      kept — counting the rest would make "insider activity" a measure of how a
      company structures compensation.

      **Counts, not dollars.** The value distribution is violently heavy-tailed:
      median $343k, p99 $99M, max $7.6bn. The extremes are real — a 10% holder
      exiting an acquired company — but they are facts about ownership
      structure, and a tree splitting on raw value would spend its capacity
      there. Distinct filer counts are bounded and comparable.

      Two bugs caught by looking at the output: a filer reported a purchase at
      **$24,035,774 per share**, which came out as a $2.4 quadrillion buy;
      and seniority was being summed per TRANSACTION rather than per filing, so
      one executive selling in fourteen tranches looked like fourteen sellers.

      **The role ladder had to be sharpened.** Weighting every officer at 1.0
      made the weighted column identical to `buyers - sellers` on 89% of rows.
      CEO/CFO now sit above other officers, which is the distinction the
      literature actually supports, and the collapse fell to 20%.

- [x] **Panel builds all four families.** 35 columns, 1.9M rows, 12 seconds.
      72.4% of rows carry 13F, 68.8% carry insider activity. `npm run
      form4:verify` proves the join: a rolling count may only move when a filing
      ARRIVES or AGES OUT, and a simulated 3-day look-ahead produces 114
      failures.
- [x] **Earnings text / NLP — FETCHED, FEATURED, WIRED, PROVED.**
      `npm run earnings`, `npm run earnings:verify`.

      8-K item 2.02, exhibit EX-99.1 — the press release itself, filed the day
      results are announced. Found through the per-company submissions API
      rather than the full-text index: the index is 58 MB a quarter and mostly
      other forms, where the API tags item 2.02 directly and reaches back to
      1998.

      **The only family whose filing date IS its availability date.** A 13F
      needs a statutory deadline and a 10-Q needs a published-by check; an 8-K
      goes out when the market sees it. That is worth stating rather than
      leaving as an absence, because a lag that needs nothing done to it is the
      one most likely to be got wrong.

      **A dictionary, not a language model.** Loughran-McDonald showed general
      sentiment lists are actively wrong on financial text — "liability",
      "vice" and "crude" are negative in a standard lexicon and neutral in a
      filing. An LLM would read these better and would also be a black box in a
      project whose argument is that every number shows its working.

      **Every feature is a COMPARISON against the same company's last release.**
      Absolute tone is mostly house style: some firms write "outstanding" every
      quarter. What might carry information is that the tone MOVED.

      Seven columns: tone, tone change, hedging, hedging change, guidance
      direction, length change, days since. Hedging is its own axis rather than
      a negative word — "may" and "could" say nothing about direction and
      everything about confidence.

      Sanity: 3M's tone climbs monotonically from -10.58 in mid-2023 to +2.05 in
      2026, which is the restructuring years recovering, visible in the
      language. `earnings:verify` proves the join — a feature may only move on a
      filing date — and a simulated five-day look-ahead produces 60 failures.

      **14,065 releases from 484 companies, and the file holds SCORES not text.**
      The prose is 658 MB, which `JSON.stringify` cannot even serialise — it
      throws RangeError before finishing. That was the first version's failure
      and the right one to have: the features need seven numbers per release,
      not the words. The text stays cached per company, so changing the
      dictionary means re-scoring rather than re-fetching.

- [x] **The panel builds all five families.** 42 columns, 1.9M rows, 14 seconds.
      Coverage: 72.4% carry 13F, 68.8% insider activity, 45.1% earnings
      language — the last is lower because the release fetch goes back eight
      years and the panel starts in 2013.
- [x] **The circular-financing graph — BUILT.** `npm run circular`. 174 stakes
      held by 21 non-financial S&P 500 companies, from their own 13F filings.

          NVDA -> INTEL CORP              $17.40B
          AMZN -> RIVIAN AUTOMOTIVE        $5.50B
          NVDA -> COREWEAVE INC            $5.40B
          UBER -> Grab Holdings            $4.64B
          NVDA -> SYNOPSYS INC             $4.18B
          WMT  -> SYMBOTIC INC             $1.69B

      Exactly the structure the spec described: a chip maker holding equity in
      its customers and suppliers, a retailer holding its warehouse automator,
      a ride company holding its self-driving partner.

      **A separate pass over the same files.** `fetch-13f.mjs` sums across every
      manager and throws the filer away, which is right for an ownership feature
      and useless here — this needs the opposite projection, keyed by FILER.

      **Financials are excluded by SECTOR, not by name.** The first attempt used
      a name pattern and the top of the result was BlackRock, State Street and
      Morgan Stanley — all three are index members AND among the largest asset
      managers on earth, and no name rule separates them from operating
      companies without catching real ones.

      Four features in `circular.ts`: how much a company holds, and how much of
      it is held by other corporates. Held-by needed the token join from 13F —
      an exact match found 1 edge of 174, because "INTEL CORP" and "Intel" are
      not equal, and Intel is the largest edge in the graph.

- [x] **The circular graph is point-in-time.** Edges carry the quarter they
      were filed for, and `graphAsOf(date)` returns only those whose 45-day
      statutory deadline had passed — the same rule the ownership features obey,
      because the edges come from the same filings.

      Verified by walking it forward:

          2025-06-01     0 edges   NVDA holds 0
          2025-11-20   139 edges   NVDA holds 6
          2026-02-20   164 edges   NVDA holds 9
          2026-06-01   200 edges   NVDA holds 11

      Empty in June because nothing had been filed yet. The stake count grows as
      filings arrive rather than appearing fully formed in 2013, which is what
      the static version did.

      An edge with no period is DROPPED rather than assumed always-available —
      that default is what would quietly restore the old behaviour.
- [x] **Election / political calendar — BUILT.** Three macro columns:
      `days_to_election`, `days_since_election`, `election_year`. Computed from
      the constitutional rule — the Tuesday after the first Monday in November,
      every even year — rather than fetched, so there is no source to go stale
      and no revision to leak. Verified against 2016-11-08, 2020-11-03 and
      2024-11-05.

      The OUTCOME is deliberately absent. Who won, and whether government came
      out unified, would be the obvious next column and cannot be built: knowing
      it on any date before the election is precisely the leak this project
      keeps finding. Proximity is knowable in advance; the result is not.

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


- [x] **Confidence estimates — DONE, via conformal rather than an ensemble.**
      Ensemble variance would need a retrain AND measures the wrong thing: seeds
      disagreeing describes the fitting procedure's instability, not how far the
      answer lands from the truth. A model can be perfectly stable across seeds
      and reliably wrong.

      Conformal asks the honest question — how far was the realised return from
      the score, recently — and needs nothing but the predictions already on the
      tape. `confidenceMultiplier` turns the interval width into a sizing
      factor, scaled against the median width rather than a hardcoded constant.

- [x] **Confidence wired into sizing — AND IT MAKES THINGS WORSE.**
      `--useConfidence`, point-in-time:

          baseline          15.83%   Sharpe 0.97   maxDD 19.1%   ret/DD 0.83
          with confidence   13.45%   Sharpe 0.93   maxDD 18.2%   ret/DD 0.74

      It buys 0.9 points of drawdown and costs 2.4 points of return.

      **The mechanism is visible and it is the interesting part.** The conformal
      width runs 9.1% to 16.3% across the sample, so the multiplier only ever
      cuts — 0.73 at its most cautious, 1.00 the rest of the time. And it is
      widest in 2020-12, 2021-03 and 2020-09.

      Those are the strongest months in the sample. The model was least
      *precise* exactly when returns were largest, because a violent tape widens
      every residual — so "small when unsure" sizes DOWN into the recovery. The
      width is measuring volatility, not unreliability, and at a 21-day horizon
      the two are hard to separate.

      Kept behind a flag rather than deleted. The interval itself is sound and
      its coverage is verified; it is the mapping from width to size that does
      not hold, and a version conditioned on regime rather than raw width is a
      different experiment rather than a fix to this one.
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
- [x] **Deflated Sharpe ratio — DONE**, see "Now". E[max Sharpe] under no skill
      across 11 trials is 0.198, so the swept 1.20 is honestly 1.00.
- [x] **Garleanu-Pedersen — BUILT AND TESTED. The band wins.**
      `src/lib/engine/trading.ts`, `--optimalTrading`.

      The closed form is right and verified at both limits: free trading gives a
      rate of 1.000, ruinous cost gives 0.003, a permanent signal aims at the
      target itself and a vanishing one aims at nothing. A position converges on
      the AIM rather than the target, exactly as the paper says.

      Measured against the band, point-in-time:

          policy          annual  Sharpe   maxDD   return/maxDD  turnover
          band             15.8%    0.97   19.1%          0.83      1.05
          GP decay 0.85    14.6%    0.99   23.1%          0.63      0.84
          GP decay 0.35     7.3%    1.00   12.2%          0.63      0.38

      **It buys 0.02 of Sharpe and costs 0.20 of return per unit of drawdown.**
      Turnover falls by up to 64%, which is what it was chosen for, but the
      turnover was not the binding constraint the tracker assumed.

      Two things the sweep exposed. **Decay behaves as a leverage dial, not a
      policy**: Sharpe is pinned at 1.00 across the whole range while return
      scales linearly with it. And partial adjustment **never fully closes a
      position**, so the book holds 356 names against the band's 95 — the tail
      is a long list of fractions the model no longer likes, and closing
      instantly is the one thing GP is designed to avoid.

      Kept behind a flag rather than deleted: it is the correct policy for a
      book whose costs actually bind, and this one's do not.
- [x] **Random matrix theory — MEASURED, and the answer is a warning.**
      `src/lib/engine/covariance.ts`, `npm run covariance`.

      Validated against theory first: on pure Gaussian noise the spectrum falls
      inside the Marchenko-Pastur band with nothing above it. Without that step
      every number below would be unfalsifiable.

          T      N   ratio    noise band   signal   share of variance
        250    100    0.40   [0.14, 2.66]       6               42.8%
        250    200    0.80   [0.01, 3.59]       8               45.6%
        500    200    0.40   [0.14, 2.66]       8               48.8%
       1000    300    0.30   [0.20, 2.40]      13               51.9%

      **At 250 observations of 100 names, six eigenvalues carry 42.8% of the
      variance and the other 94 directions are indistinguishable from noise.**
      Even at 1000 observations it is 13 of 300 and barely half the variance.

      So a full covariance here is roughly half signal. Every method that wants
      one — portfolio optimisation, the vector form of Gârleanu-Pedersen, risk
      parity — is fitting that noise unless it clips the spectrum first, and the
      book's inverse-volatility sizing avoids the problem by using only the
      diagonal.

      That is why this was built with no consumer. It is not an improvement to
      the book; it is the measurement that says what a covariance-based method
      would be standing on.
- [x] **Regime-conditional model averaging — NOT BUILT, and deliberately.**
      This item and "Regime-conditional weighting" below are the same hypothesis
      written twice, and the hypothesis was tested and rejected.

      Its whole premise is that macro helps in volatile years and hurts in calm
      ones. Measured across fifteen CPCV arrangements: corr(IC, market
      volatility) = **0.152**, corr(IC, share below the 200-day) = **-0.091**,
      against a 5% critical value of ~0.514 at n=15. Neither is close.

      Building a mixture-of-experts on top of that would be fitting a switch to
      a dependence that is not there — an HMM will always find states, and
      giving each family a regime-dependent weight will always improve the fit
      in-sample. The measurement exists precisely so that stops being tempting.

      Reopening this needs new evidence of regime dependence, not a better
      method for exploiting the evidence we checked and did not find.
- [x] **Conformal prediction — BUILT AND ITS COVERAGE MEASURED.**
      `src/lib/engine/conformal.ts`, `npm run conformal`.

          alpha   nominal   measured    width       n
           0.50       50%      51.3%    4.24%   21,729
           0.20       80%      81.7%    8.65%   21,729
           0.10       90%      90.8%   11.93%   21,729
           0.05       95%      95.3%   15.43%   21,729

      **Coverage holds at every level**, on out-of-sample days, with no
      distributional assumption used anywhere. The slight over-coverage is the
      finite-sample correction erring conservative, which is the direction it is
      supposed to err in.

      Split conformal done honestly: calibrate on days whose outcome was already
      known, test on a later day, and end calibration at least one horizon
      before the test day or the outcome leaks into its own interval.

      The check tolerates over-coverage and fails under-coverage, deliberately —
      an interval narrower than it claims is a confidence estimate that lies.
- [x] **Combinatorial purged cross-validation — DONE.** `src/lib/engine/cpcv.ts`,
      15 splits, purging in both directions, zero days on both sides.

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
