import type { Category } from './types';

export const twoPointers: Category = {
  slug: 'two-pointers',
  title: 'Two Pointers',
  blurb: 'Two indices walking toward each other (or together) through ordered data, each step ruling out a whole row of possibilities.',
  problems: [
    {
      slug: 'valid-palindrome',
      number: 125,
      title: 'Valid Palindrome',
      difficulty: 'Easy',
      statement: [
        'A phrase is a palindrome if, after turning uppercase letters into lowercase and removing everything that is not a letter or a digit, it reads the same forwards and backwards.',
        'Given a string `s`, return `true` if it is a palindrome and `false` otherwise.',
      ],
      constraints: ['1 ≤ s.length ≤ 2 × 10⁵', '`s` consists of printable ASCII characters.'],
      idea: [
        'A palindrome’s first character matches its last, its second matches its second-to-last, and so on. So put one pointer at each end and walk them toward each other.',
        'When a pointer is on a character that is not a letter or digit, step past it. When both are on letters or digits, compare them ignoring case: any mismatch means no. If the pointers meet, every pair matched. Nothing is copied or cleaned first.',
      ],
      complexity: { time: 'O(n) — each character is passed once', space: 'O(1) — two indices' },
    },
    {
      slug: 'two-sum-ii-input-array-is-sorted',
      number: 167,
      title: 'Two Sum II – Input Array Is Sorted',
      difficulty: 'Medium',
      statement: [
        'Given an array `numbers` sorted in non-decreasing order and a `target`, find the two numbers that add up to `target` and return their positions, counting from 1, as `[index1, index2]` with `index1 < index2`.',
        'There is exactly one answer, you may not use an element twice, and you may use only constant extra space.',
      ],
      constraints: ['2 ≤ numbers.length ≤ 3 × 10⁴', '−1000 ≤ numbers[i], target ≤ 1000', 'Exactly one solution exists.'],
      idea: [
        'The order is the clue. Take the smallest and the largest: `l` at the start and `r` at the end. If their sum is too small, the only way to raise it is a bigger left number — `l` moves right. Too big, and `r` moves left.',
        'Each move rules out one number for good: if `numbers[l] + numbers[r]` is too small, then `numbers[l]` plus anything is too small, since `numbers[r]` was the largest left. So the pointers meet the answer in at most n steps, with no extra memory.',
      ],
      complexity: { time: 'O(n)', space: 'O(1)' },
    },
    {
      slug: '3sum',
      number: 15,
      title: '3Sum',
      difficulty: 'Medium',
      statement: [
        'Given an integer array `nums`, return every triplet `[nums[i], nums[j], nums[k]]` of three different positions whose values add up to 0.',
        'The answer must not contain the same triplet twice (the same three values in any order count as the same).',
      ],
      constraints: ['3 ≤ nums.length ≤ 3000', '−10⁵ ≤ nums[i] ≤ 10⁵'],
      idea: [
        'Sort the array. Then fix the first number `nums[i]`: what remains is Two Sum II on the rest of the array — find two numbers adding to `−nums[i]` — which two pointers solve in one pass.',
        'Duplicates are skipped at both levels: if `nums[i]` equals the previous first number, it would find the same triplets, so skip it; after recording a triplet, move `l` past copies of the same value. And once `nums[i]` is positive, three numbers at least that large cannot sum to 0, so stop.',
      ],
      complexity: { time: 'O(n²) — n choices of the first number, one linear scan each', space: 'O(1) extra (besides sorting and the output)' },
    },
    {
      slug: 'container-with-most-water',
      number: 11,
      title: 'Container With Most Water',
      difficulty: 'Medium',
      statement: [
        'You are given `n` vertical lines; line `i` has height `height[i]` and stands at position `i`. Choose two lines that, with the ground, form a container.',
        'Return the most water such a container can hold: the distance between the two lines times the height of the shorter one.',
      ],
      constraints: ['2 ≤ n ≤ 10⁵', '0 ≤ height[i] ≤ 10⁴'],
      idea: [
        'Start with the widest container, the two outermost lines. Any other container is narrower, so to hold more it needs a taller shorter wall.',
        'The shorter wall is the limit. Moving the taller wall inward can only make things worse — narrower, and still capped by the same short wall. So always move the shorter one inward, recording the area at every step. Each step discards a line that can never be part of a better answer.',
      ],
      complexity: { time: 'O(n)', space: 'O(1)' },
    },
    {
      slug: 'trapping-rain-water',
      number: 42,
      title: 'Trapping Rain Water',
      difficulty: 'Hard',
      statement: [
        'An elevation map is given as `height`: bar `i` is `height[i]` tall and 1 wide. After it rains, how many units of water are trapped between the bars?',
      ],
      constraints: ['1 ≤ height.length ≤ 2 × 10⁴', '0 ≤ height[i] ≤ 10⁵'],
      idea: [
        'The water above bar `i` rises to the lower of two walls: the tallest bar on its left and the tallest bar on its right. It holds `min(leftMax, rightMax) − height[i]` units.',
        'Two pointers avoid storing those maxima. Keep `l` and `r` at the ends with `leftMax` and `rightMax`. If `height[l] < height[r]`, there is a wall on the right at least as tall as anything on the left, so the left side’s level is exactly `leftMax`: add `leftMax − height[l]` and step `l` in. Otherwise do the same from the right.',
      ],
      complexity: { time: 'O(n) — one pass', space: 'O(1)' },
    },
  ],
};
