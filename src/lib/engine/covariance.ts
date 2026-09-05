/**
 * WHICH PARTS OF A SAMPLE COVARIANCE ARE REAL.
 *
 * Marchenko & Pastur (1967); the clipping procedure is Laloux, Cizeau, Bouchaud
 * & Potters (1999), "Noise Dressing of Financial Correlation Matrices".
 *
 * ---
 * THE PROBLEM
 *
 * A 500 x 500 covariance has 125,250 distinct entries. Estimating it from 250
 * daily observations means fitting 125,250 numbers from 125,000 data points —
 * fewer observations than parameters. The estimate is not merely noisy; it is
 * singular, and most of its structure is an artefact of having asked for it.
 *
 * Marchenko-Pastur says exactly how much. For a matrix of pure noise with T
 * observations and N series, the eigenvalues of the sample correlation fall in
 * a known band:
 *
 *     lambda± = (1 ± sqrt(N/T))²
 *
 * Anything inside that band is indistinguishable from noise at this sample
 * size. Anything above it is signal — usually a handful of eigenvalues, the
 * largest being the market itself.
 *
 * ---
 * WHY THIS IS BUILT WITH NO CONSUMER YET
 *
 * Nothing in this engine uses a covariance. The book sizes by inverse
 * volatility, which is the diagonal and nothing else, and Gârleanu-Pedersen was
 * implemented in its scalar form for exactly this reason.
 *
 * So this is not an improvement to the book. It is the measurement that decides
 * whether a covariance is worth having at all: if the eigenvalue spectrum turns
 * out to be almost entirely inside the noise band, then every method that wants
 * a full covariance — portfolio optimisation, the vector form of GP, risk
 * parity — is building on an estimate that does not exist, and knowing that is
 * worth more than another feature.
 */

/** The Marchenko-Pastur edges for T observations of N series. */
export function noiseBand(observations: number, series: number) {
  const q = series / observations;
  const root = Math.sqrt(q);
  return { lower: (1 - root) ** 2, upper: (1 + root) ** 2, ratio: q };
}

/**
 * Correlation matrix from returns, columns being series.
 *
 * Correlation rather than covariance, because Marchenko-Pastur is stated for a
 * matrix whose diagonal is 1. Rescaling by volatilities afterwards recovers the
 * covariance without changing which eigenvalues are noise.
 */
export function correlation(returns: number[][]): number[][] {
  const T = returns.length;
  const N = returns[0]?.length ?? 0;
  if (!T || !N) return [];

  const mean = new Array(N).fill(0);
  for (const row of returns) for (let j = 0; j < N; j++) mean[j] += row[j] / T;

  const sd = new Array(N).fill(0);
  for (const row of returns) {
    for (let j = 0; j < N; j++) sd[j] += (row[j] - mean[j]) ** 2;
  }
  for (let j = 0; j < N; j++) sd[j] = Math.sqrt(sd[j] / (T - 1)) || 1;

  const out: number[][] = Array.from({ length: N }, () => new Array(N).fill(0));
  for (const row of returns) {
    for (let i = 0; i < N; i++) {
      const zi = (row[i] - mean[i]) / sd[i];
      for (let j = i; j < N; j++) {
        const v = (zi * (row[j] - mean[j])) / sd[j];
        out[i][j] += v;
        if (i !== j) out[j][i] += v;
      }
    }
  }
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) out[i][j] /= T - 1;
  return out;
}

/**
 * Eigenvalues of a symmetric matrix, by the Jacobi rotation method.
 *
 * Jacobi rather than a Householder tridiagonalisation because it is short,
 * numerically stable on symmetric input, and needs no library — and this runs
 * once on a few hundred series rather than in a loop. Eigenvectors are not
 * returned because the spectrum is the whole question here.
 */
export function eigenvalues(matrix: number[][], sweeps = 60): number[] {
  const n = matrix.length;
  const a = matrix.map((r) => [...r]);

  for (let sweep = 0; sweep < sweeps; sweep++) {
    // Largest off-diagonal magnitude; when it is small enough the matrix is
    // diagonal to working precision and the diagonal holds the eigenvalues.
    let off = 0;
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) off += a[i][j] * a[i][j];
    if (off < 1e-12) break;

    for (let p = 0; p < n - 1; p++) {
      for (let q = p + 1; q < n; q++) {
        if (Math.abs(a[p][q]) < 1e-14) continue;
        const theta = (a[q][q] - a[p][p]) / (2 * a[p][q]);
        const t = Math.sign(theta || 1) / (Math.abs(theta) + Math.sqrt(theta * theta + 1));
        const c = 1 / Math.sqrt(t * t + 1);
        const s = t * c;

        for (let k = 0; k < n; k++) {
          const akp = a[k][p];
          const akq = a[k][q];
          a[k][p] = c * akp - s * akq;
          a[k][q] = s * akp + c * akq;
        }
        for (let k = 0; k < n; k++) {
          const apk = a[p][k];
          const aqk = a[q][k];
          a[p][k] = c * apk - s * aqk;
          a[q][k] = s * apk + c * aqk;
        }
      }
    }
  }
  return a.map((r, i) => r[i]).sort((x, y) => y - x);
}

export type Spectrum = {
  eigenvalues: number[];
  band: ReturnType<typeof noiseBand>;
  /** How many eigenvalues sit above the noise edge. */
  signal: number;
  /** Share of total variance carried by those. */
  signalShare: number;
  /** The largest, which in equity data is the market factor. */
  market: number;
};

/**
 * The spectrum, split into what is real and what is not.
 *
 * The interpretation matters more than the arithmetic. A handful of eigenvalues
 * above the band and a bulk inside it is the expected picture for equities: the
 * market factor, a few sector rotations, and several hundred directions that
 * are indistinguishable from noise at this sample size. The share of variance
 * those noise directions carry is the fraction of any optimiser's answer that
 * would be determined by nothing.
 */
export function spectrum(returns: number[][]): Spectrum {
  const T = returns.length;
  const N = returns[0]?.length ?? 0;
  const values = eigenvalues(correlation(returns));
  const band = noiseBand(T, N);

  const above = values.filter((v) => v > band.upper);
  const total = values.reduce((s, v) => s + v, 0);

  return {
    eigenvalues: values,
    band,
    signal: above.length,
    signalShare: total > 0 ? above.reduce((s, v) => s + v, 0) / total : NaN,
    market: values[0] ?? NaN,
  };
}
