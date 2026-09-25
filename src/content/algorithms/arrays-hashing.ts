import type { Category } from './types';

export const arraysHashing: Category = {
  slug: 'arrays-hashing',
  title: 'Arrays & Hashing',
  blurb: 'Trade memory for time: a hash map answers “have I seen this?” in one step instead of a search.',
  problems: [
    {
      slug: 'two-sum',
      number: 1,
      title: 'Two Sum',
      difficulty: 'Easy',
      statement: [
        'You are given an array of integers `nums` and a number `target`. Exactly two of the numbers, at different positions, add up to `target`.',
        'Return the positions (indices) of those two numbers, in any order. The same element cannot be used twice, and there is always exactly one answer.',
      ],
      constraints: ['2 ≤ nums.length ≤ 10⁴', '−10⁹ ≤ nums[i], target ≤ 10⁹', 'Exactly one valid answer exists.'],
      idea: [
        'Checking every pair works, but that is n × n comparisons. Turn the question around: standing on a number `x`, the partner it needs is `target − x`. So the only question is “have I already seen `target − x`?”',
        'A hash map (a table that finds a value by its key in constant time on average) remembers each number’s index as we walk past it. For each `x`: if `target − x` is in the map, we have the pair; otherwise store `x` and move on. One pass, and each lookup is one step.',
      ],
      complexity: { time: 'O(n) — one pass, constant-time lookups', space: 'O(n) — the map holds up to n numbers' },
    },
  ],
};
