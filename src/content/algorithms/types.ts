/**
 * The algorithms page's content: the NeetCode 150, grouped by the pattern
 * each problem teaches, in NeetCode's own order.
 *
 * A problem's words live here — the problem restated in plain language, its
 * limits, and the idea that cracks it. Its code lives in `solutions/<slug>/`
 * (one real, tested source file per language), its test cases and examples
 * in that folder's `spec.json`, and its step-by-step picture in
 * `lib/algorithms/traces/<category>.ts`. Everything is keyed by the
 * problem's LeetCode slug.
 *
 * Text may mark code with backticks: `nums[i]`.
 */

export type Difficulty = 'Easy' | 'Medium' | 'Hard';

export interface Problem {
  /** LeetCode's slug — the key for the solution folder, the tracer and the route. */
  slug: string;
  /** LeetCode's problem number. */
  number: number;
  title: string;
  difficulty: Difficulty;
  /** The problem, in our own words. */
  statement: string[];
  constraints: string[];
  /** How to think about it: the observation that makes it easy, then the method. */
  idea: string[];
  complexity: { time: string; space: string };
}

export interface Category {
  slug: string;
  title: string;
  /** One sentence: what the pattern is. */
  blurb: string;
  problems: Problem[];
}
