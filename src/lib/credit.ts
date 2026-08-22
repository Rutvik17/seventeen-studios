/**
 * Credit risk — what a lender is actually afraid of.
 *
 * Expected loss on a single account, and then the part that matters: the
 * distribution of losses across a book whose borrowers do not fail
 * independently.
 *
 * ---
 *
 * WHY THE SECOND HALF IS THE WHOLE POINT
 *
 * Expected loss is arithmetic — probability times exposure times severity — and
 * it is budgeted for like any other cost. It does not put lenders out of
 * business. What does is the year in which far more accounts default at once
 * than usual, and "at once" is the operative phrase: the same recession costs
 * thousands of people their jobs in the same quarter.
 *
 * Model borrowers as independent and a large book looks almost risk-free, since
 * the good and bad cancel. Model the shared cause and the same book has a bad
 * year several times its average. Nothing about the accounts changed. That gap
 * is the entire reason capital requirements exist, and it is invisible without
 * simulating it.
 *
 * ---
 *
 * WHY IT IS A ONE-FACTOR MODEL
 *
 * Because that is what the Basel framework's own formula assumes, and matching
 * it means a reader who knows the subject can check this against something they
 * already trust. Each borrower's fortune is part shared economy and part private
 * luck; one number per scenario moves everyone together.
 *
 * It is a simplification and the page says so — real correlation varies by
 * sector, geography and vintage, and rises further in a crisis than any fixed
 * parameter allows.
 */

import { normalQuantile, normalStream, seededRandom } from './quant';

export type Borrower = {
  id: string;
  label: string;
  /** Probability of default over one year, 0–1. */
  pd: number;
  /** Exposure at default, in currency. */
  ead: number;
  /** Loss given default, 0–1 — the share never recovered. */
  lgd: number;
  /** How many accounts like this one are in the book. */
  count: number;
};

/**
 * Expected loss for one account.
 *
 *     EL = PD × EAD × LGD
 *
 * The three terms answer three different questions and are estimated by
 * different teams from different data, which is why the decomposition survives:
 * a change in collections practice moves LGD and nothing else.
 */
export function expectedLoss(b: Pick<Borrower, 'pd' | 'ead' | 'lgd'>): number {
  return b.pd * b.ead * b.lgd;
}

/** The book's expected loss — the sum of its parts, always. */
export function bookExpectedLoss(borrowers: Borrower[]): number {
  return borrowers.reduce((sum, b) => sum + expectedLoss(b) * b.count, 0);
}

export type BookResult = {
  /** Sorted total losses, one per simulated year. */
  losses: Float64Array;
  expected: number;
  /** The loss exceeded in only 1 year in 100. */
  worstIn100: number;
  /** And 1 in 1000, which is roughly the standard for bank capital. */
  worstIn1000: number;
  /**
   * Capital: what you must hold ON TOP of the expected loss.
   *
   * Expected loss is priced into the interest rate — it is a cost of doing
   * business. Capital covers the difference between that and a bad year, which
   * is the part no price can absorb.
   */
  capital: number;
  histogram: { x0: number; x1: number; count: number }[];
  /** Share of years in which the book loses more than it expected to. */
  worseThanExpected: number;
};

/**
 * The standard normal CDF, via a rational approximation of erf.
 *
 * Needed for the conditional default probability below. Accurate to about
 * 1.5e-7, which is several orders of magnitude better than the sampling noise
 * it feeds into.
 */
function normalCdf(x: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d = 0.3989422804014327 * Math.exp((-x * x) / 2);
  const p =
    d * t * (0.319381530 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
  return x > 0 ? 1 - p : p;
}

/**
 * Poisson draw, Knuth's method. Used where the normal approximation fails.
 *
 * Fine for the small means it is asked for here; it loops about `lambda` times,
 * which would be wrong for large ones but those take the normal branch.
 */
function poisson(lambda: number, uniform: () => number): number {
  const limit = Math.exp(-lambda);
  let k = 0;
  let product = uniform();
  while (product > limit) {
    k += 1;
    product *= uniform();
  }
  return k;
}

/**
 * Simulate a book of correlated borrowers.
 *
 *     zᵢ = √ρ · Z + √(1−ρ) · εᵢ        default when zᵢ < Φ⁻¹(PD)
 *
 * `Z` is drawn once per year and shared by everyone; `εᵢ` is private to each
 * borrower. The weights are √ρ and √(1−ρ) precisely so the two parts sum to a
 * variable with standard deviation exactly 1 — which keeps the unconditional
 * default rate equal to PD whatever ρ is.
 *
 * That property is what makes the correlation control honest. Without it,
 * raising ρ would change how OFTEN borrowers default as well as how TOGETHER
 * they do it, and no comparison between two settings would mean anything. It is
 * checkable: the simulated mean loss should barely move as ρ is dragged.
 *
 * ---
 *
 * WHY IT DOES NOT SIMULATE EACH BORROWER
 *
 * The direct version — loop every account, every year — is ten thousand
 * accounts by four thousand years, which is forty million draws and far too
 * slow to sit behind a slider.
 *
 * It is also unnecessary. ONCE the shared factor `Z` is fixed, the borrowers in
 * a band are independent and identically distributed, so the count that default
 * is a binomial draw rather than ten thousand coin flips. That collapses the
 * inner loop from the number of accounts to the number of BANDS — three — and
 * the whole simulation runs in about a millisecond.
 *
 * This is the Vasicek single-factor construction, and it is the reason the
 * Basel formula has a closed form at all.
 */
export function simulateBook(
  borrowers: Borrower[],
  options: { correlation: number; scenarios: number; seed: number },
): BookResult {
  const { correlation, scenarios, seed } = options;
  const rho = Math.max(0, Math.min(0.99, correlation));
  const wShared = Math.sqrt(rho);
  const wPrivate = Math.sqrt(1 - rho);

  const uniform = seededRandom(seed);
  const normal = normalStream(uniform);
  const losses = new Float64Array(scenarios);

  const thresholds = borrowers.map((b) => normalQuantile(b.pd));
  const severities = borrowers.map((b) => b.ead * b.lgd);

  for (let s = 0; s < scenarios; s++) {
    const economy = normal();
    let total = 0;

    for (let i = 0; i < borrowers.length; i++) {
      const { count } = borrowers[i];

      /*
        The conditional default probability: given this year's economy, how
        likely is any one borrower in this band to fail? Bad years push it far
        above the headline PD, which is precisely the effect being modelled.
      */
      const conditional = normalCdf((thresholds[i] - wShared * economy) / wPrivate);
      const mean = count * conditional;

      let defaults: number;
      if (mean >= 10 && count - mean >= 10) {
        // The normal approximation to the binomial, valid by the usual rule of
        // thumb. Rounded and clamped, because a count cannot be fractional or
        // negative.
        const sd = Math.sqrt(mean * (1 - conditional));
        defaults = Math.max(0, Math.min(count, Math.round(mean + sd * normal())));
      } else {
        // Rare events: the normal approximation is poor and can go negative,
        // so a Poisson draw is used instead. It is the right limit for exactly
        // this case — many trials, small probability.
        defaults = Math.min(count, poisson(mean, uniform));
      }
      total += defaults * severities[i];
    }
    losses[s] = total;
  }

  losses.sort();

  const expected = bookExpectedLoss(borrowers);
  const worstIn100 = losses[Math.floor(0.99 * scenarios)];
  const worstIn1000 = losses[Math.min(scenarios - 1, Math.floor(0.999 * scenarios))];

  let worse = 0;
  for (let i = 0; i < scenarios; i++) if (losses[i] > expected) worse += 1;

  return {
    losses,
    expected,
    worstIn100,
    worstIn1000,
    capital: Math.max(0, worstIn1000 - expected),
    worseThanExpected: worse / scenarios,
    histogram: bucket(losses, 42),
  };
}

function bucket(sorted: Float64Array, bins: number) {
  const lo = sorted[0];
  // Clipped at the 99.8th percentile. A correlated loss distribution has a very
  // long right tail, and letting one catastrophic year set the axis squashes
  // every ordinary one into the first bar.
  const hi = sorted[Math.floor(sorted.length * 0.998)];
  const width = (hi - lo) / bins || 1;
  const out = Array.from({ length: bins }, (_, i) => ({
    x0: lo + i * width,
    x1: lo + (i + 1) * width,
    count: 0,
  }));
  for (let i = 0; i < sorted.length; i++) {
    const b = Math.floor((sorted[i] - lo) / width);
    if (b >= 0 && b < bins) out[b].count += 1;
  }
  return out;
}

/**
 * A cardholder book with a realistic spread of quality.
 *
 * The bands and their default rates are the shape a real portfolio has — most
 * accounts are fine, a small tail is not, and the tail carries a
 * disproportionate share of the loss because it defaults more AND tends to be
 * drawn further down when it does.
 *
 * These are illustrative figures on a plausible structure, not any lender's
 * actual book, and the instrument says so.
 */
export const CARD_BOOK: Borrower[] = [
  { id: 'prime', label: 'Prime', pd: 0.006, ead: 3_400, lgd: 0.72, count: 6_000 },
  { id: 'near', label: 'Near prime', pd: 0.021, ead: 4_100, lgd: 0.75, count: 3_000 },
  { id: 'sub', label: 'Subprime', pd: 0.078, ead: 4_800, lgd: 0.82, count: 1_000 },
];

export const formatMoney = (v: number): string =>
  new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
    maximumFractionDigits: 0,
  }).format(v);
