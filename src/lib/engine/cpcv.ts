/**
 * Combinatorial purged cross-validation.
 *
 * López de Prado's construction, and the reason it exists here is measured
 * rather than theoretical: our previous selection procedure had a Spearman
 * correlation of **-0.036** with out-of-sample performance. It was choosing
 * models on information that did not predict the thing we cared about.
 *
 * ---
 * WHY THE OLD SPLIT FAILED
 *
 * Early stopping validated on the last 15% of the training window,
 * chronologically. For the 2022 fold that meant tuning on 2021 and then trading
 * 2022 — selecting a model on one regime and deploying it into another. The
 * configuration with the BEST validation loss had nearly the WORST test IC,
 * which is exactly what that failure looks like from the outside.
 *
 * A single split cannot see this. It produces one number, that number is a
 * property of where the cut happened to land, and nothing in the output says so.
 *
 * ---
 * WHAT COMBINATORIAL BUYS
 *
 * Split the timeline into N contiguous groups and hold out every possible
 * combination of k. With N=6 and k=2 that is fifteen train/test arrangements
 * instead of one, and the test sets are drawn from ACROSS the history rather
 * than only from its end.
 *
 * The output is a distribution. A model that is genuinely better is better
 * across most arrangements; a model that won one chronological split may have
 * won a regime rather than an argument.
 *
 * ---
 * WHY PURGING IS NOT OPTIONAL
 *
 * Every row is labelled with a return over the following `horizon` days. A
 * training row dated shortly BEFORE a test group carries a label that runs
 * INTO it — the model would be trained on the answer.
 *
 * Worse, and this is what people miss: because the test groups are no longer at
 * the end, contamination runs in BOTH directions. A training row just AFTER a
 * test group overlaps it too, through its own label window reaching backwards
 * in the sense that the two windows share days. Both sides get purged.
 *
 * The embargo then removes a further buffer after each test group, because
 * serial correlation in features means rows immediately following a test period
 * still carry information about it even once their labels no longer overlap.
 */

export type Split = {
  /** Row indices to train on. */
  train: number[];
  /** Row indices to test on. */
  test: number[];
  /** Which group numbers made up the test set, for reporting. */
  groups: number[];
};

export type CPCVOptions = {
  /** Number of contiguous groups the timeline is cut into. */
  groups: number;
  /** How many groups are held out per split. */
  testGroups: number;
  /** Label lookahead, in the same units as `t`. Drives purging. */
  horizon: number;
  /** Extra buffer after each test group, in the same units. */
  embargo: number;
};

export const CPCV: CPCVOptions = {
  groups: 6,
  testGroups: 2,
  horizon: 21,
  embargo: 21,
};

/** Every way to choose `k` from `n`, as arrays of indices. */
function combinations(n: number, k: number): number[][] {
  const out: number[][] = [];
  const pick = (start: number, acc: number[]) => {
    if (acc.length === k) { out.push([...acc]); return; }
    for (let i = start; i < n; i++) {
      acc.push(i);
      pick(i + 1, acc);
      acc.pop();
    }
  };
  pick(0, []);
  return out;
}

/**
 * Build the splits.
 *
 * `t` is the time index of each row — rows sharing a `t` are the same day and
 * must never be separated, which is why groups are cut on the time axis rather
 * than on rows. Cutting on rows would put the same day's names on both sides of
 * the split, and a model that has seen half of Tuesday can predict the rest of
 * it without knowing anything at all.
 */
export function purgedSplits(t: number[], options: CPCVOptions = CPCV): Split[] {
  const times = [...new Set(t)].sort((a, b) => a - b);
  if (times.length < options.groups * 2) return [];

  // Contiguous, roughly equal groups along the time axis.
  const bounds: { lo: number; hi: number }[] = [];
  const per = times.length / options.groups;
  for (let g = 0; g < options.groups; g++) {
    bounds.push({
      lo: times[Math.floor(g * per)],
      hi: times[Math.min(times.length - 1, Math.floor((g + 1) * per) - 1)],
    });
  }

  const splits: Split[] = [];
  for (const combo of combinations(options.groups, options.testGroups)) {
    const testRanges = combo.map((g) => bounds[g]);

    const train: number[] = [];
    const test: number[] = [];

    for (let i = 0; i < t.length; i++) {
      const time = t[i];
      const inTest = testRanges.some((r) => time >= r.lo && time <= r.hi);
      if (inTest) { test.push(i); continue; }

      /*
        Purge, then embargo, and both are checked against EVERY test range
        rather than only the nearest one — with non-contiguous test groups a row
        can sit safely away from one and inside the shadow of another.
      */
      const contaminated = testRanges.some((r) => {
        // This row's label window runs into the test group.
        if (time < r.lo && time + options.horizon >= r.lo) return true;
        // The test group's own label windows run into this row.
        if (time > r.hi && time <= r.hi + options.horizon + options.embargo) return true;
        return false;
      });
      if (!contaminated) train.push(i);
    }

    if (train.length > 1000 && test.length > 500) {
      splits.push({ train, test, groups: combo });
    }
  }
  return splits;
}

/**
 * How much of the data each split actually keeps.
 *
 * Worth printing rather than assuming. With aggressive purging and a long
 * horizon it is possible to discard most of the training set without noticing,
 * and a split that trains on a tenth of the data is not measuring the model —
 * it is measuring the shortage.
 */
export function splitSummary(splits: Split[], total: number) {
  const kept = splits.map((s) => (s.train.length + s.test.length) / total);
  const trainShare = splits.map((s) => s.train.length / total);
  const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / (xs.length || 1);
  return {
    splits: splits.length,
    meanTrainShare: mean(trainShare),
    meanKept: mean(kept),
    purged: 1 - mean(kept),
  };
}
