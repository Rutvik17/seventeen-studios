/**
 * Gradient-boosted decision trees, histogram-based, in plain TypeScript.
 *
 * ---
 * WHY TREES AND NOT A NEURAL NETWORK
 *
 * Three reasons, and none of them is fashion.
 *
 * MISSING DATA IS THE NORM HERE, NOT THE EXCEPTION. A company reports capex four
 * times a year and its price trades every day; insider filings arrive when an
 * insider feels like it. Trees learn a default direction for missing values at
 * every split, which is a real answer to "what should I assume when I do not
 * know". A network needs the hole filled before it can multiply, and every
 * filling strategy invents information — a mean imputation quietly tells the
 * model that a company which reported nothing is average.
 *
 * INTERACTIONS ARE THE SIGNAL. Capex acceleration means something different for
 * a semiconductor than for a utility, and something different again when the
 * market is falling. A tree expresses that in three splits. A network can learn
 * it too, given far more data than sixteen years of anything provides.
 *
 * IT HAS TO BE EXPLICABLE. Gain-based importances say which measurements the
 * model actually used, and a strategy nobody can interrogate is one nobody
 * should trade.
 *
 * ---
 * WHY HISTOGRAMS
 *
 * The naive split search sorts every feature at every node: O(n log n) per
 * feature per node, repeated for hundreds of trees. Binning each column into 255
 * buckets ONCE turns every later split search into a scan over 255 slots, which
 * is a constant. It costs a little precision at the split threshold and buys
 * roughly two orders of magnitude, and the precision does not matter because the
 * inputs are cross-sectional ranks that were already coarse.
 *
 * The subtraction trick makes it cheaper again: a node's two children partition
 * its rows, so only the smaller child needs its histogram built by scanning. The
 * larger is the parent minus the sibling.
 */

/** Bin 255 is reserved for "this value was missing". */
const MISSING_BIN = 255;
const MAX_BINS = 255;

export type GBDTOptions = {
  trees: number;
  /** Shrinkage. Lower learns more slowly and generalises better. */
  learningRate: number;
  maxDepth: number;
  /** A leaf must carry at least this much hessian — here, this many rows. */
  minChildWeight: number;
  /** L2 penalty on leaf values. The main brake on overfitting. */
  lambda: number;
  /** Rows sampled per tree. Below 1 this is stochastic boosting. */
  subsample: number;
  /** Features considered per tree. */
  colsample: number;
  /** Stop when validation loss has not improved for this many rounds. */
  earlyStopping: number;
  seed: number;
};

export const DEFAULTS: GBDTOptions = {
  trees: 400,
  learningRate: 0.03,
  maxDepth: 6,
  minChildWeight: 40,
  lambda: 5,
  subsample: 0.7,
  colsample: 0.8,
  earlyStopping: 30,
  seed: 20260825,
};

type Node = {
  feature: number;
  /** Rows with bin <= threshold go left. */
  threshold: number;
  /** Where missing values go at this split. */
  missingLeft: boolean;
  left: number;
  right: number;
  value: number;
  leaf: boolean;
};

export type GBDTModel = {
  base: number;
  learningRate: number;
  trees: Node[][];
  /** Bin upper edges per feature, for scoring unseen rows. */
  edges: number[][];
  columns: string[];
  /** Total gain attributed to each feature across every split. */
  importance: number[];
  rounds: number;
};

/** Deterministic PRNG — a backtest that changes between runs cannot be debugged. */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Quantile bin edges per feature, computed on the TRAINING rows only.
 *
 * Quantiles rather than equal width because a feature whose mass sits in a
 * narrow band would otherwise spend 250 of its 255 bins on empty space and put
 * every row that matters into one bucket.
 */
export function computeEdges(X: number[][], featureCount: number, seed = 1): number[][] {
  const rand = mulberry32(seed);
  const edges: number[][] = [];
  // A sample is enough to place quantiles and avoids sorting millions of rows
  // once per column.
  const cap = 200_000;
  const stride = X.length > cap ? X.length / cap : 1;

  for (let f = 0; f < featureCount; f++) {
    const sample: number[] = [];
    for (let i = rand() * stride; i < X.length; i += stride) {
      const v = X[Math.floor(i)][f];
      if (Number.isFinite(v)) sample.push(v);
    }
    sample.sort((a, b) => a - b);
    if (sample.length === 0) { edges.push([]); continue; }

    const unique: number[] = [];
    const want = Math.min(MAX_BINS - 1, sample.length - 1);
    for (let k = 1; k <= want; k++) {
      const v = sample[Math.floor((k / (want + 1)) * (sample.length - 1))];
      if (unique.length === 0 || v > unique[unique.length - 1]) unique.push(v);
    }
    edges.push(unique);
  }
  return edges;
}

/** Map raw features onto bin indices. Missing goes to `MISSING_BIN`. */
export function binMatrix(X: number[][], edges: number[][]): Uint8Array {
  const f = edges.length;
  const out = new Uint8Array(X.length * f);
  for (let i = 0; i < X.length; i++) {
    const row = X[i];
    for (let c = 0; c < f; c++) {
      const v = row[c];
      if (!Number.isFinite(v)) { out[i * f + c] = MISSING_BIN; continue; }
      const e = edges[c];
      // Binary search for the first edge >= v.
      let lo = 0;
      let hi = e.length;
      while (lo < hi) {
        const mid = (lo + hi) >> 1;
        if (e[mid] < v) lo = mid + 1; else hi = mid;
      }
      out[i * f + c] = Math.min(lo, MAX_BINS - 1);
    }
  }
  return out;
}

type Split = {
  feature: number;
  threshold: number;
  missingLeft: boolean;
  gain: number;
};

/**
 * Best split for one node, given its gradient/hessian histograms.
 *
 * Missing values are tried BOTH ways — swept in with the left partition and with
 * the right — and the better is kept. That is the whole reason trees tolerate
 * gaps: "no capex reported" becomes a direction the model chose, not an
 * assumption somebody imputed.
 */
function bestSplit(
  gradHist: Float64Array,
  hessHist: Float64Array,
  features: number[],
  parentGrad: number,
  parentHess: number,
  opts: GBDTOptions,
): Split | null {
  const score = (g: number, h: number) => (g * g) / (h + opts.lambda);
  const parentScore = score(parentGrad, parentHess);
  let best: Split | null = null;

  for (const f of features) {
    const base = f * 256;
    const missingGrad = gradHist[base + MISSING_BIN];
    const missingHess = hessHist[base + MISSING_BIN];

    for (const missingLeft of [true, false]) {
      let gl = missingLeft ? missingGrad : 0;
      let hl = missingLeft ? missingHess : 0;

      for (let b = 0; b < MAX_BINS - 1; b++) {
        gl += gradHist[base + b];
        hl += hessHist[base + b];
        const gr = parentGrad - gl;
        const hr = parentHess - hl;
        if (hl < opts.minChildWeight || hr < opts.minChildWeight) continue;

        const gain = score(gl, hl) + score(gr, hr) - parentScore;
        if (gain > (best?.gain ?? 1e-9)) {
          best = { feature: f, threshold: b, missingLeft, gain };
        }
      }
    }
  }
  return best;
}

export function train(
  X: number[][],
  y: number[],
  columns: string[],
  validX: number[][] | null,
  validY: number[] | null,
  options: Partial<GBDTOptions> = {},
): GBDTModel {
  const opts = { ...DEFAULTS, ...options };
  const f = columns.length;
  const n = X.length;
  if (n === 0) throw new Error('gbdt: no training rows');

  const edges = computeEdges(X, f, opts.seed);
  const bins = binMatrix(X, edges);
  const validBins = validX ? binMatrix(validX, edges) : null;

  const base = y.reduce((s, v) => s + v, 0) / n;
  const pred = new Float64Array(n).fill(base);
  const validPred = validY ? new Float64Array(validY.length).fill(base) : null;

  const grad = new Float64Array(n);
  const hess = new Float64Array(n).fill(1); // squared error: h = 1
  const importance = new Array<number>(f).fill(0);
  const rand = mulberry32(opts.seed);

  const trees: Node[][] = [];
  let bestLoss = Infinity;
  let bestRound = 0;
  let sinceBest = 0;

  for (let round = 0; round < opts.trees; round++) {
    // Squared error: the gradient is simply the residual.
    for (let i = 0; i < n; i++) grad[i] = pred[i] - y[i];

    const active: number[] = [];
    for (let i = 0; i < n; i++) if (opts.subsample >= 1 || rand() < opts.subsample) active.push(i);
    if (!active.length) break;

    const cols: number[] = [];
    for (let c = 0; c < f; c++) if (opts.colsample >= 1 || rand() < opts.colsample) cols.push(c);
    if (!cols.length) cols.push(Math.floor(rand() * f));

    const nodes: Node[] = [];
    // rowsOf[nodeId] holds that node's row indices while it is being grown.
    const rowsOf = new Map<number, number[]>();
    const histOf = new Map<number, { g: Float64Array; h: Float64Array }>();

    const buildHist = (rows: number[]) => {
      const g = new Float64Array(f * 256);
      const h = new Float64Array(f * 256);
      for (const i of rows) {
        const off = i * f;
        const gi = grad[i];
        const hi = hess[i];
        for (const c of cols) {
          const slot = c * 256 + bins[off + c];
          g[slot] += gi;
          h[slot] += hi;
        }
      }
      return { g, h };
    };

    const leafValue = (rows: number[]) => {
      let g = 0;
      let h = 0;
      for (const i of rows) { g += grad[i]; h += hess[i]; }
      return -g / (h + opts.lambda);
    };

    nodes.push({ feature: -1, threshold: 0, missingLeft: true, left: -1, right: -1, value: 0, leaf: true });
    rowsOf.set(0, active);
    histOf.set(0, buildHist(active));

    // Breadth-first to a fixed depth. Simpler than leaf-wise growth and much
    // less prone to producing one enormously deep branch fitted to noise.
    let frontier = [{ id: 0, depth: 0 }];
    while (frontier.length) {
      const next: { id: number; depth: number }[] = [];
      for (const { id, depth } of frontier) {
        const rows = rowsOf.get(id)!;
        const hist = histOf.get(id)!;

        let pg = 0;
        let ph = 0;
        for (const i of rows) { pg += grad[i]; ph += hess[i]; }

        if (depth >= opts.maxDepth || rows.length < opts.minChildWeight * 2) {
          nodes[id].value = -pg / (ph + opts.lambda);
          rowsOf.delete(id); histOf.delete(id);
          continue;
        }

        const split = bestSplit(hist.g, hist.h, cols, pg, ph, opts);
        if (!split) {
          nodes[id].value = -pg / (ph + opts.lambda);
          rowsOf.delete(id); histOf.delete(id);
          continue;
        }

        const leftRows: number[] = [];
        const rightRows: number[] = [];
        for (const i of rows) {
          const b = bins[i * f + split.feature];
          const goLeft = b === MISSING_BIN ? split.missingLeft : b <= split.threshold;
          (goLeft ? leftRows : rightRows).push(i);
        }
        if (!leftRows.length || !rightRows.length) {
          nodes[id].value = -pg / (ph + opts.lambda);
          rowsOf.delete(id); histOf.delete(id);
          continue;
        }

        importance[split.feature] += split.gain;

        const leftId = nodes.length;
        nodes.push({ feature: -1, threshold: 0, missingLeft: true, left: -1, right: -1, value: leafValue(leftRows), leaf: true });
        const rightId = nodes.length;
        nodes.push({ feature: -1, threshold: 0, missingLeft: true, left: -1, right: -1, value: leafValue(rightRows), leaf: true });

        nodes[id] = {
          feature: split.feature,
          threshold: split.threshold,
          missingLeft: split.missingLeft,
          left: leftId,
          right: rightId,
          value: 0,
          leaf: false,
        };

        /*
          Build the smaller child by scanning and derive the larger by
          subtraction. The two children partition the parent exactly, so the
          difference is not an approximation.
        */
        const smallFirst = leftRows.length <= rightRows.length;
        const smallId = smallFirst ? leftId : rightId;
        const bigId = smallFirst ? rightId : leftId;
        const smallRows = smallFirst ? leftRows : rightRows;

        const smallHist = buildHist(smallRows);
        const bigHist = { g: new Float64Array(f * 256), h: new Float64Array(f * 256) };
        for (let k = 0; k < bigHist.g.length; k++) {
          bigHist.g[k] = hist.g[k] - smallHist.g[k];
          bigHist.h[k] = hist.h[k] - smallHist.h[k];
        }

        rowsOf.set(leftId, leftRows);
        rowsOf.set(rightId, rightRows);
        histOf.set(smallId, smallHist);
        histOf.set(bigId, bigHist);
        rowsOf.delete(id); histOf.delete(id);

        next.push({ id: leftId, depth: depth + 1 }, { id: rightId, depth: depth + 1 });
      }
      frontier = next;
    }

    // Apply the new tree.
    for (let i = 0; i < n; i++) pred[i] += opts.learningRate * scoreRow(nodes, bins, i, f);
    trees.push(nodes);

    if (validBins && validPred && validY) {
      let loss = 0;
      for (let i = 0; i < validY.length; i++) {
        validPred[i] += opts.learningRate * scoreRow(nodes, validBins, i, f);
        loss += (validPred[i] - validY[i]) ** 2;
      }
      loss /= validY.length;
      if (loss < bestLoss - 1e-12) { bestLoss = loss; bestRound = round + 1; sinceBest = 0; }
      else if (++sinceBest >= opts.earlyStopping) break;
    }
  }

  /*
    Keep only the trees up to the best validation round.

    Boosting does not plateau when it starts overfitting, it keeps improving on
    training data while validation loss climbs. Without this the model ships the
    overfitted tail it was measured NOT to want.
  */
  const kept = bestRound > 0 ? trees.slice(0, bestRound) : trees;

  return {
    base,
    learningRate: opts.learningRate,
    trees: kept,
    edges,
    columns,
    importance,
    rounds: kept.length,
  };
}

function scoreRow(nodes: Node[], bins: Uint8Array, row: number, featureCount: number): number {
  let id = 0;
  while (!nodes[id].leaf) {
    const node = nodes[id];
    const b = bins[row * featureCount + node.feature];
    const goLeft = b === MISSING_BIN ? node.missingLeft : b <= node.threshold;
    id = goLeft ? node.left : node.right;
  }
  return nodes[id].value;
}

/** Predict for raw (unbinned) rows. */
export function predict(model: GBDTModel, X: number[][]): number[] {
  const bins = binMatrix(X, model.edges);
  const f = model.columns.length;
  const out = new Array<number>(X.length).fill(model.base);
  for (const tree of model.trees) {
    for (let i = 0; i < X.length; i++) out[i] += model.learningRate * scoreRow(tree, bins, i, f);
  }
  return out;
}

/** Feature importances as shares of total gain, largest first. */
export function importances(model: GBDTModel): { column: string; share: number }[] {
  const total = model.importance.reduce((s, v) => s + v, 0) || 1;
  return model.columns
    .map((column, i) => ({ column, share: model.importance[i] / total }))
    .sort((a, b) => b.share - a.share);
}
