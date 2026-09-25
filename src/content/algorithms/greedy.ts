import type { Category } from './types';

export const greedy: Category = {
  slug: 'greedy',
  title: 'Greedy',
  blurb: 'Make the choice that looks best right now and never revisit it — correct only when you can argue no later step would ever want it undone.',
  problems: [
    {
      slug: 'maximum-subarray',
      number: 53,
      title: 'Maximum Subarray',
      difficulty: 'Medium',
      statement: ['Given an integer array `nums`, return the largest sum of any subarray — a run of one or more consecutive elements.'],
      constraints: ['1 ≤ nums.length ≤ 10⁵', '−10⁴ ≤ nums[i] ≤ 10⁴'],
      idea: [
        'Kadane’s algorithm walks the array keeping `here`, the best sum of a run that ends at the current element. That run either extends the best run ending one step earlier, or starts fresh at this element — whichever is larger.',
        'The greedy insight: if the run so far has gone negative, it can only make whatever follows smaller, so drop it. The answer is the largest `here` seen. For [−2, 1, −3, 4, −1, 2, 1, −5, 4]: `here` climbs 4, 3, 5, 6 across [4, −1, 2, 1] — 6.',
      ],
      complexity: { time: 'O(n)', space: 'O(1)' },
    },
    {
      slug: 'jump-game',
      number: 55,
      title: 'Jump Game',
      difficulty: 'Medium',
      statement: ['You start at index 0. From index `i` you may jump forward any distance up to `nums[i]`. Return `true` if you can reach the last index.'],
      constraints: ['1 ≤ nums.length ≤ 10⁴', '0 ≤ nums[i] ≤ 10⁵'],
      idea: [
        'The reachable indices always form one unbroken stretch from 0: if you can get to i, you can get to everything before it. So track only its end, `reach`.',
        'Walk forward. Each index inside the stretch can push it to `i + nums[i]`. If you ever stand on an index beyond `reach`, there is a gap no jump crosses — the answer is `false`.',
      ],
      complexity: { time: 'O(n)', space: 'O(1)' },
    },
    {
      slug: 'jump-game-ii',
      number: 45,
      title: 'Jump Game II',
      difficulty: 'Medium',
      statement: ['As in Jump Game, but the last index is always reachable. Return the fewest jumps needed to reach it.'],
      constraints: ['1 ≤ nums.length ≤ 10⁴', '0 ≤ nums[i] ≤ 1000', 'The last index can be reached.'],
      idea: [
        'Think in rounds, as breadth-first search would: the indices reachable in exactly k jumps form a window. Scanning that window tells you how far k + 1 jumps can reach: the furthest `i + nums[i]` inside it.',
        'So walk the array once with `end`, the edge of the current window, and `far`, the best reach seen. When `i` reaches `end`, the window is exhausted: jump (count one) and move `end` to `far`. Stop before the last index — standing on it needs no further jump.',
      ],
      complexity: { time: 'O(n)', space: 'O(1)' },
    },
    {
      slug: 'gas-station',
      number: 134,
      title: 'Gas Station',
      difficulty: 'Medium',
      statement: [
        'Gas stations stand in a circle. Station `i` gives `gas[i]` units, and driving from station `i` to the next costs `cost[i]`. You start with an empty tank at a station of your choice.',
        'Return the station from which you can drive all the way round once, or −1 if none. If a start exists, it is unique.',
      ],
      constraints: ['1 ≤ n ≤ 10⁵', '0 ≤ gas[i], cost[i] ≤ 10⁴'],
      idea: [
        'If the total gas is less than the total cost, no start works. Otherwise one does — and it can be found in one pass.',
        'Drive from station 0, keeping a running tank. If it goes negative after station i, then no station from the current start up to i can be the answer: each of them would arrive at i + 1 with no more gas than this attempt had (it would have skipped the stations before it, which added a non-negative amount). So restart at i + 1 with an empty tank. The last restart is the answer.',
      ],
      complexity: { time: 'O(n)', space: 'O(1)' },
    },
    {
      slug: 'hand-of-straights',
      number: 846,
      title: 'Hand of Straights',
      difficulty: 'Medium',
      statement: ['Given the values of a hand of cards and a `groupSize`, return `true` if the cards can be rearranged into groups of `groupSize` consecutive values, each card used once.'],
      constraints: ['1 ≤ hand.length ≤ 10⁴', '0 ≤ hand[i] ≤ 10⁹', '1 ≤ groupSize ≤ hand.length'],
      idea: [
        'Look at the smallest card left. Nothing smaller remains to go before it, so it must start a group: that group needs the next `groupSize − 1` values.',
        'Count the cards, and go through the values in increasing order. If a value still has `n` copies, `n` groups must start there, so take `n` of each of the next values; if any is short, the answer is `false`. Handling a whole count at once, instead of one group at a time, keeps it fast.',
      ],
      complexity: { time: 'O(n log n) — sorting the distinct values', space: 'O(n)' },
    },
    {
      slug: 'merge-triplets-to-form-target-triplet',
      number: 1899,
      title: 'Merge Triplets to Form Target Triplet',
      difficulty: 'Medium',
      statement: [
        'Merging two triplets `[a, b, c]` replaces one of them with `[max(a₁, a₂), max(b₁, b₂), max(c₁, c₂)]` — the larger value in each position.',
        'Given a list of triplets and a `target`, return `true` if some merges can make one triplet equal to `target`.',
      ],
      constraints: ['1 ≤ triplets.length ≤ 10⁵', '1 ≤ every value ≤ 1000'],
      idea: [
        'Merging can only raise values. So a triplet with any value above the target’s in that position can never be part of the answer — it would push that position too high for good. Ignore it.',
        'Every other triplet is safe: merging it in never overshoots. Merge them all (just track, for each of the three positions, whether some safe triplet matches the target there). The target is reachable exactly when all three positions are matched.',
      ],
      complexity: { time: 'O(n)', space: 'O(1)' },
    },
    {
      slug: 'partition-labels',
      number: 763,
      title: 'Partition Labels',
      difficulty: 'Medium',
      statement: ['Cut a string `s` into as many parts as possible so that each letter appears in at most one part. Return the sizes of the parts, in order.'],
      constraints: ['1 ≤ s.length ≤ 500', 'Only lowercase English letters.'],
      idea: [
        'A part that contains a letter must stretch at least to that letter’s last appearance. So first record where each letter appears for the last time.',
        'Walk the string, stretching the current part’s `end` to the last appearance of every letter met. When the walk reaches `end`, every letter inside has finished — cut there, as early as possible, which makes the parts as many as possible.',
      ],
      complexity: { time: 'O(n)', space: 'O(1) — 26 positions' },
    },
    {
      slug: 'valid-parenthesis-string',
      number: 678,
      title: 'Valid Parenthesis String',
      difficulty: 'Medium',
      statement: [
        'A string holds `(`, `)` and `*`. Each `*` can stand for `(`, for `)`, or for nothing. Return `true` if some choice makes the brackets balanced: every `(` closed by a later `)`, and no `)` without an earlier `(`.',
      ],
      constraints: ['1 ≤ s.length ≤ 100', 'Each character is (, ) or *.'],
      idea: [
        'Without stars, one count of unclosed `(` would do. With stars, the count could be several values at once — so track the range, from `lo` (every `*` read as `)`) to `hi` (every `*` read as `(`). Every value in between is possible too.',
        'If `hi` ever drops below 0, even the most generous reading has an unmatched `)`: false. `lo` below 0 is just a reading that went wrong, so raise it back to 0. At the end, the string can be balanced exactly when 0 is in the range — when `lo` is 0.',
      ],
      complexity: { time: 'O(n)', space: 'O(1)' },
    },
  ],
};
