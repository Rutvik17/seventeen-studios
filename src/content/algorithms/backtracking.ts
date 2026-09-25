import type { Category } from './types';

export const backtracking: Category = {
  slug: 'backtracking',
  title: 'Backtracking',
  blurb: 'Build an answer one choice at a time; when a choice leads nowhere, undo it and try the next. Every answer is a path through a tree of choices.',
  problems: [
    {
      slug: 'subsets',
      number: 78,
      title: 'Subsets',
      difficulty: 'Medium',
      statement: ['Given an array `nums` of different integers, return every subset — every selection of its elements, including none and all — in any order, without repeats.'],
      constraints: ['1 ≤ nums.length ≤ 10', '−10 ≤ nums[i] ≤ 10', 'All the numbers are different.'],
      idea: [
        'Each element is either in a subset or not: two choices, n times, so there are 2ⁿ subsets. Picture a tree of decisions: at level i, one branch takes `nums[i]` and the other leaves it out; each leaf is one subset.',
        'Backtracking walks that tree depth-first with one working list: add `nums[i]`, explore everything below, remove it again (undo), then explore the branch without it. At the bottom, a copy of the list is an answer.',
      ],
      complexity: { time: 'O(n · 2ⁿ) — 2ⁿ subsets, each copied', space: 'O(n) besides the answer — the working list and the calls' },
    },
    {
      slug: 'combination-sum',
      number: 39,
      title: 'Combination Sum',
      difficulty: 'Medium',
      statement: [
        'Given an array of different positive integers `candidates` and a `target`, return every combination of candidates that adds up to `target`. The same number may be used any number of times; two combinations are different if some number is used a different number of times. Any order.',
      ],
      constraints: ['1 ≤ candidates.length ≤ 30', '2 ≤ candidates[i] ≤ 40, all different', '1 ≤ target ≤ 40'],
      idea: [
        'Build a combination by choosing numbers in order of their position: after choosing `candidates[i]`, the next choice may be `candidates[i]` again or anything after it, never anything before. That order is what stops `2, 3` and `3, 2` both being produced.',
        'Carry what is still needed. At 0, the combination is complete. With the candidates sorted, as soon as one is bigger than what is left, every later one is too — stop trying that branch.',
      ],
      complexity: { time: 'O(n^(t/m)) in the worst case — t the target, m the smallest candidate, so no combination is longer than t/m', space: 'O(t/m) besides the answer' },
    },
    {
      slug: 'permutations',
      number: 46,
      title: 'Permutations',
      difficulty: 'Medium',
      statement: ['Given an array `nums` of different integers, return every permutation — every ordering of all its elements — in any order.'],
      constraints: ['1 ≤ nums.length ≤ 6', '−10 ≤ nums[i] ≤ 10', 'All the numbers are different.'],
      idea: [
        'There are n choices for the first position, n − 1 for the second, and so on: n! (“n factorial”, n × (n − 1) × … × 1) orderings. For 3 numbers, 3 × 2 × 1 = 6.',
        'Fill the positions left to right, in place. Positions before `k` are settled; everything from `k` on is still unused. For each unused element, swap it into position `k`, fill the rest, and swap it back — the undo that makes this backtracking.',
      ],
      complexity: { time: 'O(n · n!) — n! orderings, each copied', space: 'O(n) besides the answer' },
    },
    {
      slug: 'subsets-ii',
      number: 90,
      title: 'Subsets II',
      difficulty: 'Medium',
      statement: ['Given an array `nums` that may contain repeated values, return every different subset, in any order. Two subsets holding the same values the same number of times count as one.'],
      constraints: ['1 ≤ nums.length ≤ 10', '−10 ≤ nums[i] ≤ 10'],
      idea: [
        'Sort first, so equal values sit side by side. Then build each subset by choosing its elements in position order: from a subset, try adding each later element in turn.',
        'The repeats come from choosing “the first 2” and “the second 2” for the same spot, which gives the same subset twice. So, among the options for one spot, skip an element equal to the one just before it. A later 2 can still be added after an earlier 2 — that is a different spot.',
      ],
      complexity: { time: 'O(n · 2ⁿ)', space: 'O(n) besides the answer' },
    },
    {
      slug: 'combination-sum-ii',
      number: 40,
      title: 'Combination Sum II',
      difficulty: 'Medium',
      statement: [
        'Given an array `candidates`, which may contain repeated values, and a `target`, return every different combination that adds up to `target`. Each element may be used at most once. Any order, no repeated combinations.',
      ],
      constraints: ['1 ≤ candidates.length ≤ 100', '1 ≤ candidates[i] ≤ 50', '1 ≤ target ≤ 30'],
      idea: [
        'This is Combination Sum with two changes. Each element is used at most once, so after choosing `candidates[i]` the next choice starts at `i + 1`.',
        'And repeats in the input would produce repeated combinations, so do as in Subsets II: sort, and among the options for one spot, skip a value equal to the one just tried. Sorting also means that once a value is too big, all the rest are.',
      ],
      complexity: { time: 'O(n · 2ⁿ) in the worst case', space: 'O(n) besides the answer' },
    },
    {
      slug: 'word-search',
      number: 79,
      title: 'Word Search',
      difficulty: 'Medium',
      statement: [
        'Given an `m × n` grid of letters and a `word`, return `true` if the word can be traced on the grid: moving between cells that touch horizontally or vertically, one letter per cell, using no cell twice.',
      ],
      constraints: ['1 ≤ m, n ≤ 6', '1 ≤ word.length ≤ 15', 'Upper- and lowercase English letters only.'],
      idea: [
        'Try each cell as the start. From a cell holding the right letter, the next letter must be in one of its four neighbours: explore each, depth-first. If none works, this cell is a dead end — undo and return.',
        'A cell on the current path is marked (overwritten with `#`) so the path cannot loop back through it, and unmarked on the way back so other paths can use it. Before any search, check the board has enough of each letter the word needs; if not, the answer is `false` at once.',
      ],
      complexity: { time: 'O(m · n · 4 · 3^(L−1)) — each start, 4 directions, then 3 new ones a step', space: 'O(L) — the path, L the word’s length' },
    },
    {
      slug: 'palindrome-partitioning',
      number: 131,
      title: 'Palindrome Partitioning',
      difficulty: 'Medium',
      statement: [
        'A palindrome reads the same forwards and backwards, like `aba`. Given a string `s`, return every way to cut it into pieces that are all palindromes, in any order.',
      ],
      constraints: ['1 ≤ s.length ≤ 16', 'Only lowercase English letters.'],
      idea: [
        'Cut from the left. The first piece is `s[0..j]` for some `j`, and it must be a palindrome; then cut the rest the same way. Every first piece that works is one branch of the search.',
        'Checking a piece from scratch each time repeats work, so first fill a table: `s[i..j]` is a palindrome when its end letters match and its inside, `s[i+1..j−1]`, is one (a piece of one or two matching letters needs no inside). Filling it from the end of the string backwards means the inside is always known first.',
      ],
      complexity: { time: 'O(n · 2ⁿ) — up to 2ⁿ⁻¹ ways to cut, each copied', space: 'O(n²) — the table' },
    },
    {
      slug: 'letter-combinations-of-a-phone-number',
      number: 17,
      title: 'Letter Combinations of a Phone Number',
      difficulty: 'Medium',
      statement: [
        'On a phone keypad, the digits 2–9 each stand for letters: 2 is `abc`, 3 `def`, 4 `ghi`, 5 `jkl`, 6 `mno`, 7 `pqrs`, 8 `tuv`, 9 `wxyz`.',
        'Given a string of digits, return every string of letters it could spell, in any order. An empty input gives an empty list.',
      ],
      constraints: ['0 ≤ digits.length ≤ 4', 'Each digit is between 2 and 9.'],
      idea: [
        'Each digit is a choice of 3 or 4 letters, made independently. Choose a letter for the first digit, then for the second, and so on; when every digit has a letter, that string is an answer. Then undo the last choice and try the next letter.',
        '“23” gives 3 × 3 = 9 strings, from `ad` to `cf`.',
      ],
      complexity: { time: 'O(n · 4ⁿ) — at most 4ⁿ strings of length n', space: 'O(n) besides the answer' },
    },
    {
      slug: 'n-queens',
      number: 51,
      title: 'N-Queens',
      difficulty: 'Hard',
      statement: [
        'A chess queen attacks every square in its row, its column and both of its diagonals. Place `n` queens on an `n × n` board so that no two attack each other.',
        'Return every such arrangement, each as `n` strings — one per row, `Q` for a queen and `.` for an empty square — in any order.',
      ],
      constraints: ['1 ≤ n ≤ 9'],
      idea: [
        'No two queens can share a row, so there is exactly one per row. Place them row by row: in row `r`, try each column that is not attacked, place a queen, move on to row `r + 1`; if a row has no safe column, go back and move the previous queen.',
        'Checking “is this square attacked?” is one step with three sets. Squares on the same “\\” diagonal all have the same `r − c`; on the same “/” diagonal, the same `r + c`. So a square is attacked exactly when its column, its `r − c` or its `r + c` is already taken.',
      ],
      complexity: { time: 'O(n!) — at most n choices in the first row, fewer in each after', space: 'O(n²) — the board' },
    },
  ],
};
