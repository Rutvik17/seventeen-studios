import type { Category } from './types';

export const arraysHashing: Category = {
  slug: 'arrays-hashing',
  title: 'Arrays & Hashing',
  blurb: 'Trade memory for time: a hash map answers “have I seen this?” in one step instead of a search.',
  problems: [
    {
      slug: 'contains-duplicate',
      number: 217,
      title: 'Contains Duplicate',
      difficulty: 'Easy',
      statement: ['Given an array of integers `nums`, return `true` if any value appears at least twice, and `false` if every value is different.'],
      constraints: ['1 ≤ nums.length ≤ 10⁵', '−10⁹ ≤ nums[i] ≤ 10⁹'],
      idea: [
        'Comparing every pair of numbers takes n × n steps. Instead, remember what has gone past.',
        'A hash set is a collection that answers “is this already in here?” in constant time on average. Walk the array: if the number is already in the set, it is a duplicate — stop. Otherwise add it. If the walk ends, every number was new.',
      ],
      complexity: { time: 'O(n) — each number is checked and added once', space: 'O(n) — the set can hold every number' },
    },
    {
      slug: 'valid-anagram',
      number: 242,
      title: 'Valid Anagram',
      difficulty: 'Easy',
      statement: [
        'Given two strings `s` and `t`, return `true` if `t` is an anagram of `s` — the same letters, each used the same number of times, possibly in a different order — and `false` otherwise.',
      ],
      constraints: ['1 ≤ s.length, t.length ≤ 5 × 10⁴', '`s` and `t` contain only lowercase English letters.'],
      idea: [
        'Order does not matter, only how many of each letter there are. So count.',
        'Keep 26 counters, one per letter. Walk both strings together: each letter of `s` adds one to its counter, each letter of `t` takes one away. If the strings are anagrams, every counter ends back at zero. (Different lengths can be ruled out at once.)',
      ],
      complexity: { time: 'O(n) — one pass over both strings', space: 'O(1) — always exactly 26 counters' },
    },
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
    {
      slug: 'group-anagrams',
      number: 49,
      title: 'Group Anagrams',
      difficulty: 'Medium',
      statement: ['Given an array of strings `strs`, group together the words that are anagrams of each other — made of exactly the same letters. Return the groups in any order.'],
      constraints: ['1 ≤ strs.length ≤ 10⁴', '0 ≤ strs[i].length ≤ 100', 'Every string contains only lowercase English letters.'],
      idea: [
        'Two words are anagrams exactly when they contain the same number of each letter. So give every word a “signature”: its 26 letter counts. Anagrams share a signature; nothing else does.',
        'Use the signature as a key in a hash map whose values are lists of words. Each word is counted (length k) and dropped into its list. Sorting each word would also give a signature, but costs k log k per word; counting costs k.',
      ],
      complexity: { time: 'O(n · k) — n words, each of length up to k, counted once', space: 'O(n · k) — the map holds every word' },
    },
    {
      slug: 'top-k-frequent-elements',
      number: 347,
      title: 'Top K Frequent Elements',
      difficulty: 'Medium',
      statement: ['Given an integer array `nums` and an integer `k`, return the `k` values that appear most often. The answer is guaranteed to be unique, and may be returned in any order.'],
      constraints: ['1 ≤ nums.length ≤ 10⁵', '−10⁴ ≤ nums[i] ≤ 10⁴', '`k` is between 1 and the number of distinct values.'],
      idea: [
        'First count how often each value appears, with a hash map. Then we need the values with the largest counts — and sorting them would cost n log n.',
        'But a count can only be between 1 and n. So make n + 1 “buckets”: bucket `f` holds every value that appears exactly `f` times. Walking the buckets from the highest down hands out values from most frequent to least; stop after `k`. This is bucket sort, and it is linear.',
      ],
      complexity: { time: 'O(n) — count, fill buckets, read buckets', space: 'O(n) — the counts and the buckets' },
    },
    {
      slug: 'product-of-array-except-self',
      number: 238,
      title: 'Product of Array Except Self',
      difficulty: 'Medium',
      statement: [
        'Given an integer array `nums`, return an array `answer` where `answer[i]` is the product of every element of `nums` except `nums[i]`.',
        'Do it in O(n) time and without using division.',
      ],
      constraints: ['2 ≤ nums.length ≤ 10⁵', '−30 ≤ nums[i] ≤ 30', 'Every product fits in a 32-bit integer.'],
      idea: [
        'The product of everything except `nums[i]` is (everything to its left) × (everything to its right). Both sides can be built up as running products.',
        'Pass left to right keeping `prefix`, the product so far, and write it into `answer[i]` before multiplying `nums[i]` in. Then pass right to left keeping `suffix` the same way, multiplying it into `answer[i]`. No division, so zeros need no special case.',
      ],
      complexity: { time: 'O(n) — two passes', space: 'O(1) extra — only the output array and two numbers' },
    },
    {
      slug: 'valid-sudoku',
      number: 36,
      title: 'Valid Sudoku',
      difficulty: 'Medium',
      statement: [
        'A 9 × 9 Sudoku board is partly filled with digits 1–9; empty cells are `.`. Decide whether the filled cells break any rule: no digit may repeat in a row, in a column, or in any of the nine 3 × 3 boxes.',
        'The board does not need to be solvable — only the cells already filled are checked.',
      ],
      constraints: ['`board` is 9 × 9.', 'Each cell is a digit 1–9 or `.`.'],
      idea: [
        'Every filled cell belongs to exactly one row, one column and one box. Keep, for each of the 27 units, a record of which digits it already holds; the box of cell (r, c) is number `(r ÷ 3) × 3 + c ÷ 3`, rounding down.',
        'Scan the board once. For each digit, if its row, column or box has already seen it, the board is invalid; otherwise record it in all three. A record of nine digits fits in nine bits of one integer, so each check is a single AND.',
      ],
      complexity: { time: 'O(1) — always 81 cells (O(n²) for an n × n board)', space: 'O(1) — 27 small records' },
    },
    {
      slug: 'encode-and-decode-strings',
      number: 271,
      title: 'Encode and Decode Strings',
      difficulty: 'Medium',
      statement: [
        'Design `encode`, which turns a list of strings into one string, and `decode`, which turns that string back into the original list.',
        'The strings may contain any characters — including whatever you might have chosen as a separator — so decoding must recover the list exactly.',
      ],
      constraints: ['0 ≤ strs.length ≤ 200', '0 ≤ strs[i].length ≤ 200', 'Strings may contain any of the 256 ASCII characters.'],
      idea: [
        'A plain separator fails as soon as a string contains it. Instead, write each string’s length before it: `4#neet`. The decoder reads digits up to the first `#`, which gives the length `n`, then takes exactly the next `n` characters, whatever they are.',
        'Because the decoder never looks for a separator inside a string, a `#` there is harmless: it is simply one of the `n` characters taken.',
      ],
      complexity: { time: 'O(total length) for both', space: 'O(total length) for the output' },
    },
    {
      slug: 'longest-consecutive-sequence',
      number: 128,
      title: 'Longest Consecutive Sequence',
      difficulty: 'Medium',
      statement: [
        'Given an unsorted array of integers `nums`, return the length of the longest run of consecutive values — like 1, 2, 3, 4 — that can be made from its elements. The run does not have to appear in order in the array.',
        'It must run in O(n) time.',
      ],
      constraints: ['0 ≤ nums.length ≤ 10⁵', '−10⁹ ≤ nums[i] ≤ 10⁹'],
      idea: [
        'Sorting would find runs, but costs n log n. Put every number into a hash set instead, so “is x in the array?” takes one step.',
        'A number `x` starts a run exactly when `x − 1` is not in the set. Only from those starts, count upward — `x + 1`, `x + 2`, … — while the numbers exist. Each number is counted by the one run it belongs to, so all the counting together is linear.',
      ],
      complexity: { time: 'O(n) — each number is visited a constant number of times', space: 'O(n) — the set' },
    },
  ],
};
