import type { Category } from './types';

export const intervals: Category = {
  slug: 'intervals',
  title: 'Intervals',
  blurb: 'Stretches of a line, from a start to an end. Sort them by one end, and overlaps become a question about neighbours.',
  problems: [
    {
      slug: 'insert-interval',
      number: 57,
      title: 'Insert Interval',
      difficulty: 'Medium',
      statement: [
        'An interval `[start, end]` covers every point from `start` to `end`. You are given a list of intervals that do not overlap, sorted by start, and one more interval, `newInterval`.',
        'Insert it, merging whatever it overlaps, and return the list — still sorted, still without overlaps.',
      ],
      constraints: ['0 ≤ intervals.length ≤ 10⁴', '0 ≤ start ≤ end ≤ 10⁵', '`intervals` is sorted by start and has no overlaps.'],
      idea: [
        'The list is already sorted, so it falls into three runs: intervals that end before the new one starts (untouched), intervals that overlap it, and intervals that start after it ends (untouched).',
        'Copy the first run. Then absorb every overlapping interval into the new one, stretching its start down to the smallest start and its end up to the largest end. Add it, and copy the rest. One pass, no sorting.',
      ],
      complexity: { time: 'O(n)', space: 'O(n) — the answer' },
    },
    {
      slug: 'merge-intervals',
      number: 56,
      title: 'Merge Intervals',
      difficulty: 'Medium',
      statement: ['Given a list of intervals, merge every group that overlaps (touching counts: `[1, 4]` and `[4, 5]` merge) and return the resulting intervals.'],
      constraints: ['1 ≤ intervals.length ≤ 10⁴', '0 ≤ start ≤ end ≤ 10⁴'],
      idea: [
        'Sort by start. Now an interval can only overlap the merged one just before it: everything earlier ended before that one began, or it would have been merged into it.',
        'Walk the sorted list. If an interval starts no later than the last merged one ends, stretch that one’s end; otherwise it begins a new merged interval.',
      ],
      complexity: { time: 'O(n log n) — the sort', space: 'O(n)' },
    },
    {
      slug: 'non-overlapping-intervals',
      number: 435,
      title: 'Non-overlapping Intervals',
      difficulty: 'Medium',
      statement: ['Return the fewest intervals to remove so that the rest do not overlap. Intervals that only touch, like `[1, 2]` and `[2, 3]`, do not overlap.'],
      constraints: ['1 ≤ intervals.length ≤ 10⁵', '−5 × 10⁴ ≤ start < end ≤ 5 × 10⁴'],
      idea: [
        'Removing the fewest is keeping the most. Sort by end and keep greedily: take the interval that ends first, then the next that starts after it ends, and so on.',
        'Why the earliest end: whatever the best selection’s first interval is, swapping it for the one that ends first cannot cause a clash — it ends even sooner — so there is always a best selection that starts that way. The same argument repeats for every later choice. The answer is the number not kept.',
      ],
      complexity: { time: 'O(n log n)', space: 'O(1) besides the sort' },
    },
    {
      slug: 'meeting-rooms',
      number: 252,
      title: 'Meeting Rooms',
      difficulty: 'Easy',
      statement: ['Given meeting times as intervals `[start, end]`, return `true` if one person could attend them all — no two meetings overlap. A meeting may start the moment another ends.'],
      constraints: ['0 ≤ intervals.length ≤ 10⁴', '0 ≤ start < end ≤ 10⁶'],
      idea: [
        'Sort the meetings by start time. If any two overlap, then some meeting and the one right after it in this order overlap — so only neighbours need checking.',
        'Each meeting must end by the time the next begins.',
      ],
      complexity: { time: 'O(n log n)', space: 'O(1) besides the sort' },
    },
    {
      slug: 'meeting-rooms-ii',
      number: 253,
      title: 'Meeting Rooms II',
      difficulty: 'Medium',
      statement: ['Given meeting times as intervals, return the fewest rooms needed to hold them all. A room freed the moment one meeting ends can host another starting at that moment.'],
      constraints: ['1 ≤ intervals.length ≤ 10⁴', '0 ≤ start < end ≤ 10⁶'],
      idea: [
        'The rooms needed is the largest number of meetings going on at any one moment. Sweep through time: every start takes a room, every end gives one back.',
        'Which meeting ends does not matter, only when — so sort the starts and the ends separately. Walk the starts in order; before each one, release every meeting that has ended by then (an end equal to the start counts, since the room is free). The busiest count seen is the answer.',
      ],
      complexity: { time: 'O(n log n)', space: 'O(n)' },
    },
    {
      slug: 'minimum-interval-to-include-each-query',
      number: 1851,
      title: 'Minimum Interval to Include Each Query',
      difficulty: 'Hard',
      statement: [
        'An interval `[left, right]` has size `right − left + 1`. For each number in `queries`, return the size of the smallest interval containing it, or −1 if none does.',
      ],
      constraints: ['1 ≤ intervals.length, queries.length ≤ 10⁵', '1 ≤ left ≤ right ≤ 10⁷', '1 ≤ queries[j] ≤ 10⁷'],
      idea: [
        'Checking every interval for every query is 10¹⁰ steps. Instead answer the queries in increasing order, and sort the intervals by their left end; then intervals only ever join the candidates and leave them, each once.',
        'For a query x: add every interval that starts at or before x to a min-heap ordered by size. Some in the heap may already have ended before x; the smallest-first order means only the top matters, so pop the top while it has ended — it is useless for every later, larger query too. What remains on top is the smallest interval holding x. Answers are written back in the queries’ original order.',
      ],
      complexity: { time: 'O(n log n + q log q)', space: 'O(n + q)' },
    },
  ],
};
