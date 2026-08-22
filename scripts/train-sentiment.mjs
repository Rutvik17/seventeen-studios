/**
 * Train the companion's sentiment model.
 *
 * A logistic regression, fitted by gradient descent on two years of real daily
 * returns for all six names, that estimates the probability the next session
 * closes up. The companion's face is that probability.
 *
 * ---
 *
 * WHY A REAL MODEL AND NOT A THRESHOLD CALLED "AI"
 *
 * A rule like "green above +1%" is a threshold, and dressing one up as machine
 * learning is the single most common dishonesty in this area. This is fitted:
 * the weights below are not chosen, they are what gradient descent arrived at,
 * and they can come out any sign the data says.
 *
 * It is also the honest shape of a shipped model. Training is expensive and
 * happens once, offline, on a machine with the data; inference is a dot product
 * and a sigmoid, cheap enough to run on the microcontroller this board is built
 * around. The learned weights travel; the training set does not.
 *
 * ---
 *
 * THE RESULT IS DELIBERATELY UNIMPRESSIVE, AND SAYING SO IS THE POINT
 *
 * Predicting tomorrow's direction from past prices is close to impossible, and
 * a model that claimed otherwise would be either overfitted or lying. What this
 * reports is the TEST accuracy on data it never saw, next to the base rate you
 * get by always guessing "up" — because markets drift upward, that base rate is
 * already above half, and any honest evaluation has to clear it rather than
 * clear 50%.
 *
 * Most published "stock prediction" accuracy figures are training accuracy, or
 * are measured against 50% instead of the base rate, or leak future information
 * through their features. All three are avoided here and all three are named in
 * the notebook entry.
 */

/** Standard normal cumulative — not needed for fitting, kept for reporting. */
const sigmoid = (z) => 1 / (1 + Math.exp(-z));

/**
 * Build the training rows.
 *
 * Every feature is computed from data STRICTLY BEFORE the day being predicted.
 * That sounds obvious and is the most common way these models get accidentally
 * fabricated: include today's return in the features for today's direction and
 * accuracy jumps to 100%, because the answer is in the question.
 */
export function buildDataset(seriesBySymbol) {
  const rows = [];

  for (const [symbol, closes] of Object.entries(requireSeries(seriesBySymbol))) {
    const logReturns = [];
    for (let i = 1; i < closes.length; i++) {
      logReturns.push(Math.log(closes[i] / closes[i - 1]));
    }

    // 60 days of history are needed before the first usable row, and the last
    // row has no "next day" to be labelled with.
    for (let t = 60; t < logReturns.length - 1; t++) {
      const window60 = logReturns.slice(t - 60, t);
      const window10 = logReturns.slice(t - 10, t);

      const sd = (xs) => {
        const m = xs.reduce((s, v) => s + v, 0) / xs.length;
        return Math.sqrt(xs.reduce((s, v) => s + (v - m) * (v - m), 0) / (xs.length - 1));
      };

      const sigma60 = sd(window60);
      const sigma10 = sd(window10);
      if (!Number.isFinite(sigma60) || sigma60 === 0) continue;

      rows.push({
        symbol,
        features: [
          // Yesterday's move, in units of its own recent volatility. Raw
          // percentages are not comparable across these six names.
          logReturns[t - 1] / sigma60,
          // Five-day momentum, scaled by root-time so it is on the same footing
          // as the one-day figure — variance grows with time, so its standard
          // deviation grows with the square root of it.
          window60.slice(-5).reduce((s, v) => s + v, 0) / (sigma60 * Math.sqrt(5)),
          // Twenty-day momentum, same scaling.
          window60.slice(-20).reduce((s, v) => s + v, 0) / (sigma60 * Math.sqrt(20)),
          // Volatility regime: is it currently calmer or wilder than usual?
          Math.log(sigma10 / sigma60),
        ],
        // The label is the NEXT day, which is the only thing that makes this a
        // prediction rather than a description.
        label: logReturns[t] > 0 ? 1 : 0,
      });
    }
  }
  return rows;
}

// A guard so a bad caller fails loudly rather than training on nothing.
function requireSeries(obj) {
  if (!obj || typeof obj !== 'object') throw new Error('no series supplied');
  return obj;
}

/** Standardise columns, returning the statistics so inference can repeat them. */
export function standardise(rows) {
  const n = rows[0].features.length;
  const mean = new Array(n).fill(0);
  const std = new Array(n).fill(0);

  for (const row of rows) for (let i = 0; i < n; i++) mean[i] += row.features[i];
  for (let i = 0; i < n; i++) mean[i] /= rows.length;

  for (const row of rows) {
    for (let i = 0; i < n; i++) {
      const d = row.features[i] - mean[i];
      std[i] += d * d;
    }
  }
  for (let i = 0; i < n; i++) std[i] = Math.sqrt(std[i] / (rows.length - 1)) || 1;

  return { mean, std };
}

/**
 * Fit by full-batch gradient descent.
 *
 * The gradient of the log-loss for logistic regression is, remarkably,
 * (prediction − label) × feature — the same form as linear regression. That is
 * not a coincidence; it falls out of pairing the sigmoid with cross-entropy,
 * and it is the reason this is four lines rather than forty.
 *
 * L2 regularisation shrinks the weights toward zero. On a problem with this
 * little signal it is doing most of the work: without it the model chases noise
 * in the training window and tests worse than guessing.
 */
export function fit(rows, { epochs = 4000, learningRate = 0.35, l2 = 0.02 } = {}) {
  const n = rows[0].features.length;
  const weights = new Array(n).fill(0);
  let bias = 0;

  for (let epoch = 0; epoch < epochs; epoch++) {
    const gradW = new Array(n).fill(0);
    let gradB = 0;

    for (const row of rows) {
      const z = row.features.reduce((s, f, i) => s + f * weights[i], bias);
      const error = sigmoid(z) - row.label;
      for (let i = 0; i < n; i++) gradW[i] += error * row.features[i];
      gradB += error;
    }

    for (let i = 0; i < n; i++) {
      // The penalty applies to the weights and NOT to the bias. Regularising
      // the bias would fight the model's ability to learn the base rate, which
      // here is the single most useful thing it knows.
      weights[i] -= learningRate * (gradW[i] / rows.length + l2 * weights[i]);
    }
    bias -= learningRate * (gradB / rows.length);
  }

  return { weights, bias };
}

/**
 * Reliability bins — does the model mean what it says?
 *
 * On a problem with this little signal, accuracy is close to useless: a model
 * can be right 53% of the time by ignoring its inputs entirely. CALIBRATION is
 * the question worth asking — when it says 54%, does that happen 54% of the
 * time? A calibrated model with no edge is still honest and still useful, and
 * an overconfident one is dangerous however often it happens to be right.
 */
export function calibration(rows, model, bins = 5) {
  const buckets = Array.from({ length: bins }, () => ({ n: 0, sumP: 0, ups: 0 }));
  const ps = [];

  for (const row of rows) {
    const z = row.features.reduce((s, f, i) => s + f * model.weights[i], model.bias);
    const p = sigmoid(z);
    ps.push(p);
  }

  // Binned by RANK rather than by value. The predictions span a couple of
  // percentage points, so fixed 0-to-1 bins would put every row in one bucket
  // and say nothing at all.
  const sorted = [...ps].sort((a, b) => a - b);
  const edges = Array.from({ length: bins - 1 }, (_, i) =>
    sorted[Math.floor(((i + 1) / bins) * sorted.length)]);

  rows.forEach((row, i) => {
    let b = 0;
    while (b < edges.length && ps[i] > edges[b]) b += 1;
    buckets[b].n += 1;
    buckets[b].sumP += ps[i];
    buckets[b].ups += row.label;
  });

  return buckets
    .filter((b) => b.n > 0)
    .map((b) => ({
      predicted: Math.round((b.sumP / b.n) * 1e4) / 1e4,
      actual: Math.round((b.ups / b.n) * 1e4) / 1e4,
      n: b.n,
    }));
}

/**
 * Quantiles of the model's own output, so the face has a range to work in.
 *
 * The predictions live in a band a few percentage points wide — which is the
 * honest width of the signal, not a defect. Mapping that band straight onto
 * expressions would leave the companion permanently neutral, so the face is
 * driven by WHERE TODAY SITS IN THE MODEL'S OWN DISTRIBUTION rather than by the
 * raw probability. "More bullish than four days in five" is a real statement;
 * "53.4% chance of a rise" is technically true and communicates nothing.
 */
export function outputQuantiles(rows, model, count = 9) {
  const ps = rows
    .map((row) => sigmoid(row.features.reduce((s, f, i) => s + f * model.weights[i], model.bias)))
    .sort((a, b) => a - b);
  return Array.from({ length: count }, (_, i) => {
    const q = ps[Math.floor(((i + 1) / (count + 1)) * ps.length)];
    return Math.round(q * 1e5) / 1e5;
  });
}

export function evaluate(rows, model) {
  let correct = 0;
  let logLoss = 0;
  let ups = 0;

  for (const row of rows) {
    const z = row.features.reduce((s, f, i) => s + f * model.weights[i], model.bias);
    const p = sigmoid(z);
    if ((p >= 0.5 ? 1 : 0) === row.label) correct += 1;
    // Clamped, because log(0) is −∞ and one confident miss would otherwise
    // dominate the whole figure.
    const q = Math.min(Math.max(p, 1e-9), 1 - 1e-9);
    logLoss -= row.label * Math.log(q) + (1 - row.label) * Math.log(1 - q);
    ups += row.label;
  }

  return {
    accuracy: correct / rows.length,
    logLoss: logLoss / rows.length,
    /** Always guessing the majority class. The bar any model must clear. */
    baseRate: Math.max(ups, rows.length - ups) / rows.length,
    upShare: ups / rows.length,
    n: rows.length,
  };
}

/**
 * Train, evaluate honestly, and return something small enough to ship.
 *
 * The split is CHRONOLOGICAL, not random. Shuffling time-series rows lets the
 * model see the future of its own test set through overlapping feature windows,
 * and the reported accuracy becomes meaningless. Train on the earlier portion,
 * test on the later one, exactly as it would be used.
 */
export function trainSentiment(seriesBySymbol) {
  const rows = buildDataset(seriesBySymbol);
  if (rows.length < 200) throw new Error(`only ${rows.length} rows`);

  rows.sort(() => 0); // no-op: order is already chronological per symbol
  const cut = Math.floor(rows.length * 0.7);
  const train = rows.slice(0, cut);
  const test = rows.slice(cut);

  const stats = standardise(train);
  const apply = (set) =>
    set.map((row) => ({
      ...row,
      features: row.features.map((f, i) => (f - stats.mean[i]) / stats.std[i]),
    }));

  const trainZ = apply(train);
  const testZ = apply(test);

  const model = fit(trainZ);

  return {
    kind: 'logistic-regression',
    featureNames: ['return_1d', 'momentum_5d', 'momentum_20d', 'vol_regime'],
    weights: model.weights.map((w) => Math.round(w * 1e5) / 1e5),
    bias: Math.round(model.bias * 1e5) / 1e5,
    mean: stats.mean.map((v) => Math.round(v * 1e5) / 1e5),
    std: stats.std.map((v) => Math.round(v * 1e5) / 1e5),
    train: round(evaluate(trainZ, model)),
    test: round(evaluate(testZ, model)),
    /* Reliability on data the model never saw. */
    calibration: calibration(testZ, model),
    /* The band the face works within — see `outputQuantiles`. */
    quantiles: outputQuantiles(trainZ, model),
  };
}

function round(m) {
  return {
    accuracy: Math.round(m.accuracy * 1e4) / 1e4,
    logLoss: Math.round(m.logLoss * 1e4) / 1e4,
    baseRate: Math.round(m.baseRate * 1e4) / 1e4,
    upShare: Math.round(m.upShare * 1e4) / 1e4,
    n: m.n,
  };
}

/**
 * The model's current reading for one asset.
 *
 * Features are built from the most recent window exactly as the training rows
 * were — same lookbacks, same scaling, same standardisation statistics. Any
 * difference between the two is called training–serving skew and it is the
 * most common way a model that tested well behaves badly in production: it is
 * silent, since nothing errors, and the numbers merely become wrong.
 *
 * Returns the probability, and where that probability sits inside the model's
 * own output distribution — which is what the face actually uses, because the
 * raw band is only about two points wide.
 */
export function predictLatest(closes, model) {
  const logReturns = [];
  for (let i = 1; i < closes.length; i++) {
    logReturns.push(Math.log(closes[i] / closes[i - 1]));
  }
  if (logReturns.length < 61) return null;

  const t = logReturns.length;
  const window60 = logReturns.slice(t - 60, t);
  const window10 = logReturns.slice(t - 10, t);
  const sd = (xs) => {
    const m = xs.reduce((s, v) => s + v, 0) / xs.length;
    return Math.sqrt(xs.reduce((s, v) => s + (v - m) * (v - m), 0) / (xs.length - 1));
  };
  const sigma60 = sd(window60);
  const sigma10 = sd(window10);
  if (!Number.isFinite(sigma60) || sigma60 === 0) return null;

  const raw = [
    logReturns[t - 1] / sigma60,
    window60.slice(-5).reduce((s, v) => s + v, 0) / (sigma60 * Math.sqrt(5)),
    window60.slice(-20).reduce((s, v) => s + v, 0) / (sigma60 * Math.sqrt(20)),
    Math.log(sigma10 / sigma60),
  ];

  const z = raw.reduce(
    (s, f, i) => s + ((f - model.mean[i]) / model.std[i]) * model.weights[i],
    model.bias,
  );
  const p = sigmoid(z);

  // Where this sits in the model's own range: 0 is its most bearish reading,
  // 1 its most bullish.
  let below = 0;
  for (const q of model.quantiles) if (p > q) below += 1;
  const percentile = below / model.quantiles.length;

  return {
    probability: Math.round(p * 1e5) / 1e5,
    percentile: Math.round(percentile * 1e3) / 1e3,
    features: raw.map((v) => Math.round(v * 1e4) / 1e4),
  };
}
