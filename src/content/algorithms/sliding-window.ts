import type { Category } from './types';

export const slidingWindow: Category = {
  slug: 'sliding-window',
  title: 'Sliding Window',
  blurb: 'A stretch of the array that grows at one end and shrinks at the other, so every contiguous stretch is considered without starting over.',
  problems: [
    {
      slug: 'best-time-to-buy-and-sell-stock',
      number: 121,
      title: 'Best Time to Buy and Sell Stock',
      difficulty: 'Easy',
      statement: [
        '`prices[i]` is a stock’s price on day `i`. You may buy one share on one day and sell it on a later day.',
        'Return the largest profit you can make. If no trade makes money, return 0.',
      ],
      constraints: ['1 ≤ prices.length ≤ 10⁵', '0 ≤ prices[i] ≤ 10⁴'],
      idea: [
        'If you sell on a given day, the best day to have bought is the cheapest day before it. So walk the days once, remembering the lowest price seen so far.',
        'On each day, the profit from selling today is `price − lowest`; keep the largest. The buy day is the left edge of a window and today its right edge; the window’s left edge jumps whenever a new lowest price appears.',
      ],
      complexity: { time: 'O(n)', space: 'O(1)' },
    },
    {
      slug: 'longest-substring-without-repeating-characters',
      number: 3,
      title: 'Longest Substring Without Repeating Characters',
      difficulty: 'Medium',
      statement: ['Given a string `s`, return the length of the longest substring — a stretch of consecutive characters — in which no character appears twice.'],
      constraints: ['0 ≤ s.length ≤ 5 × 10⁴', '`s` consists of English letters, digits, symbols and spaces.'],
      idea: [
        'Grow a window `[l, r]` one character at a time. It stays valid as long as the new character is not already inside it.',
        'Remember where each character was last seen. When `s[r]` was last seen at or after `l`, the window now holds it twice, so jump `l` to just past that earlier copy. After each step the window is the longest valid one ending at `r`; the best of those is the answer.',
      ],
      complexity: { time: 'O(n) — each character enters the window once', space: 'O(1) — at most 128 remembered positions' },
    },
    {
      slug: 'longest-repeating-character-replacement',
      number: 424,
      title: 'Longest Repeating Character Replacement',
      difficulty: 'Medium',
      statement: [
        'Given a string `s` of uppercase letters and a number `k`, you may change any character to any other uppercase letter, at most `k` times in total.',
        'Return the length of the longest stretch of one repeated letter you can make.',
      ],
      constraints: ['1 ≤ s.length ≤ 10⁵', '`s` has only uppercase English letters.', '0 ≤ k ≤ s.length'],
      idea: [
        'For a window, the best plan is to keep its most common letter and change all the others. That takes `window length − count of the most common letter` changes. The window is usable if that is at most `k`.',
        'Slide a window across, counting letters. When it needs more than `k` changes, move its left edge in by one. The window never has to shrink below its best size so far — only a window with a higher top count could be longer — so its size at the end is the answer.',
      ],
      complexity: { time: 'O(n)', space: 'O(1) — 26 counters' },
    },
    {
      slug: 'permutation-in-string',
      number: 567,
      title: 'Permutation in String',
      difficulty: 'Medium',
      statement: ['Given strings `s1` and `s2`, return `true` if some rearrangement of `s1` appears in `s2` as a stretch of consecutive characters, and `false` otherwise.'],
      constraints: ['1 ≤ s1.length, s2.length ≤ 10⁴', 'Both contain only lowercase English letters.'],
      idea: [
        'A rearrangement of `s1` has exactly the same letter counts as `s1`, and the same length. So slide a window of exactly `s1.length` across `s2`, and ask whether its counts match.',
        'Keep `need[c]`, how many more of letter `c` the window still needs, and `missing`, the total still needed. A letter entering lowers `missing` if it was needed; a letter leaving raises it again if it becomes needed. When `missing` is 0, the window is a rearrangement.',
      ],
      complexity: { time: 'O(n) over s2', space: 'O(1) — 26 counters' },
    },
    {
      slug: 'minimum-window-substring',
      number: 76,
      title: 'Minimum Window Substring',
      difficulty: 'Hard',
      statement: [
        'Given strings `s` and `t`, return the shortest substring of `s` that contains every character of `t`, including repeats (if `t` has two `a`s, the window needs two).',
        'If no such substring exists, return the empty string `""`. The answer is unique when it exists.',
      ],
      constraints: ['1 ≤ s.length, t.length ≤ 10⁵', 'Both consist of uppercase and lowercase English letters.'],
      idea: [
        'Expand a window to the right until it covers `t`, then shrink it from the left for as long as it still covers `t`, recording the smallest seen. Then expand again.',
        'Track coverage with `need[c]` (how many more `c` are wanted; it goes negative for extras) and `missing` (how many of `t`’s characters are uncovered). Adding a character that was wanted lowers `missing`; removing one that becomes wanted raises it. Each character enters and leaves the window once.',
      ],
      complexity: { time: 'O(|s| + |t|)', space: 'O(1) — 128 counters' },
    },
    {
      slug: 'sliding-window-maximum',
      number: 239,
      title: 'Sliding Window Maximum',
      difficulty: 'Hard',
      statement: ['A window of size `k` slides across `nums` from left to right, one position at a time. Return the largest value inside the window at each position.'],
      constraints: ['1 ≤ nums.length ≤ 10⁵', '−10⁴ ≤ nums[i] ≤ 10⁴', '1 ≤ k ≤ nums.length'],
      idea: [
        'Keep a deque — a queue you can add to and remove from at both ends — of indices whose values decrease from front to back. The front is always the current window’s maximum.',
        'When `nums[i]` arrives, any smaller values at the back can never be a maximum again (`nums[i]` is larger and will stay in the window longer), so pop them, then push `i`. If the front index has slid out of the window, drop it. Every index is pushed and popped at most once.',
      ],
      complexity: { time: 'O(n)', space: 'O(k) — the deque' },
    },
  ],
};
