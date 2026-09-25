import type { Category } from './types';

export const binarySearch: Category = {
  slug: 'binary-search',
  title: 'Binary Search',
  blurb: 'Halve the possibilities with every question: whenever the answer lies on one side of a line you can test, log n steps find it.',
  problems: [
    {
      slug: 'binary-search',
      number: 704,
      title: 'Binary Search',
      difficulty: 'Easy',
      statement: ['Given a sorted array of distinct integers `nums` and a `target`, return the index of `target`, or −1 if it is not there. It must run in O(log n) time.'],
      constraints: ['1 ≤ nums.length ≤ 10⁴', '−10⁴ < nums[i], target < 10⁴', '`nums` is sorted in ascending order, with no repeats.'],
      idea: [
        'Look at the middle element. Because the array is sorted, if it is smaller than the target, the target can only be to its right; if larger, only to its left. Either way half the array is ruled out with one comparison.',
        'Keep the range still in play as `lo..hi` and repeat on the half that remains. Halving n repeatedly reaches 1 after about log₂ n steps — 14 steps for 10,000 elements.',
      ],
      complexity: { time: 'O(log n)', space: 'O(1)' },
    },
    {
      slug: 'search-a-2d-matrix',
      number: 74,
      title: 'Search a 2D Matrix',
      difficulty: 'Medium',
      statement: [
        'An `m × n` matrix has every row sorted left to right, and the first number of each row is larger than the last number of the row above.',
        'Given a `target`, return `true` if it is in the matrix. It must run in O(log(m × n)) time.',
      ],
      constraints: ['1 ≤ m, n ≤ 100', '−10⁴ ≤ matrix[i][j], target ≤ 10⁴'],
      idea: [
        'Read row by row, the matrix is one sorted list of `m × n` numbers. So binary search that list without building it.',
        'Position `k` in the list is row `k ÷ n` (rounded down) and column `k mod n` (the remainder). Binary search over `k` from 0 to `m × n − 1`, turning each `mid` into a row and column to read.',
      ],
      complexity: { time: 'O(log(m × n))', space: 'O(1)' },
    },
    {
      slug: 'koko-eating-bananas',
      number: 875,
      title: 'Koko Eating Bananas',
      difficulty: 'Medium',
      statement: [
        'There are `n` piles of bananas; pile `i` has `piles[i]`. Koko chooses a speed `k` bananas per hour. Each hour she eats `k` bananas from one pile — or the whole pile if it has fewer, and then waits for the hour to end.',
        'The guards return in `h` hours. Return the smallest `k` that lets her finish every pile in time.',
      ],
      constraints: ['1 ≤ piles.length ≤ 10⁴', 'piles.length ≤ h ≤ 10⁹', '1 ≤ piles[i] ≤ 10⁹'],
      idea: [
        'At speed `k`, a pile of `p` takes ⌈p ÷ k⌉ hours (rounded up). The total only goes down as `k` goes up. So there is a line: every speed below the answer is too slow, every speed from it up is fast enough.',
        'Binary search for that line between 1 and the largest pile (at that speed every pile takes one hour, and `h` is at least the number of piles). Checking one speed costs one pass over the piles.',
      ],
      complexity: { time: 'O(n log M) — M is the largest pile', space: 'O(1)' },
    },
    {
      slug: 'find-minimum-in-rotated-sorted-array',
      number: 153,
      title: 'Find Minimum in Rotated Sorted Array',
      difficulty: 'Medium',
      statement: [
        'A sorted array of distinct numbers has been rotated: some number of elements were moved from the front to the back, so `[0,1,2,4,5,6,7]` might become `[4,5,6,7,0,1,2]`.',
        'Return the smallest element, in O(log n) time.',
      ],
      constraints: ['1 ≤ n ≤ 5000', '−5000 ≤ nums[i] ≤ 5000', 'All values are distinct; the array was sorted, then rotated 1 to n times.'],
      idea: [
        'The minimum sits right after the one place where the values drop. Compare the middle with the last element of the range: if `nums[mid] > nums[hi]`, the drop is between them, so the minimum is to the right of `mid`.',
        'Otherwise `mid..hi` is sorted, so nothing right of `mid` can be smaller than `nums[mid]`: the minimum is `mid` or to its left. The range shrinks to one element — the minimum.',
      ],
      complexity: { time: 'O(log n)', space: 'O(1)' },
    },
    {
      slug: 'search-in-rotated-sorted-array',
      number: 33,
      title: 'Search in Rotated Sorted Array',
      difficulty: 'Medium',
      statement: ['A sorted array of distinct integers has been rotated at an unknown point (see the previous problem). Given a `target`, return its index, or −1 if it is absent, in O(log n) time.'],
      constraints: ['1 ≤ nums.length ≤ 5000', '−10⁴ ≤ nums[i], target ≤ 10⁴', 'All values are distinct.'],
      idea: [
        'Split the range at `mid`. However the array was rotated, at least one of the two halves is sorted — the one not containing the drop. A sorted half is easy to test: the target is in it exactly when it lies between the half’s end values.',
        'So find the sorted half (`nums[lo] ≤ nums[mid]` means the left one), check whether the target falls inside it, and keep that half or the other. Each step still halves the range.',
      ],
      complexity: { time: 'O(log n)', space: 'O(1)' },
    },
    {
      slug: 'time-based-key-value-store',
      number: 981,
      title: 'Time Based Key-Value Store',
      difficulty: 'Medium',
      statement: [
        'Design a store that keeps several values for the same key, each stamped with a time. `set(key, value, timestamp)` stores a value; `get(key, timestamp)` returns the value set at the latest time at or before `timestamp`, or `""` if there is none.',
        'The timestamps passed to `set` always increase.',
      ],
      constraints: ['1 ≤ key.length, value.length ≤ 100', '1 ≤ timestamp ≤ 10⁷', 'At most 2 × 10⁵ calls in total.'],
      idea: [
        'Keep, for each key, its list of (timestamp, value) pairs. Because timestamps only increase, appending keeps every list sorted — for free.',
        '`get` then binary searches that list for the first entry later than the requested time; the entry just before it is the latest one at or before that time. No entry before it means the answer is `""`.',
      ],
      complexity: { time: 'O(1) to set, O(log n) to get', space: 'O(total number of sets)' },
    },
    {
      slug: 'median-of-two-sorted-arrays',
      number: 4,
      title: 'Median of Two Sorted Arrays',
      difficulty: 'Hard',
      statement: [
        'Given two sorted arrays `nums1` and `nums2`, return the median of all their numbers together — the middle value, or the average of the two middle values when the total count is even.',
        'It must run in O(log(m + n)) time.',
      ],
      constraints: ['0 ≤ m, n ≤ 1000, and m + n ≥ 1', '−10⁶ ≤ nums1[i], nums2[i] ≤ 10⁶'],
      idea: [
        'The median splits all the numbers into a left half and a right half with everything on the left ≤ everything on the right. The left half takes some `i` numbers from the front of one array and `half − i` from the front of the other; choosing `i` fixes the split.',
        'A split is right when the largest on the left of each array is ≤ the smallest on the right of the other. If the first array’s left side is too big, take fewer from it; otherwise take more. That is a binary search over `i` in the shorter array. The median is then read off the four numbers at the cut.',
      ],
      complexity: { time: 'O(log min(m, n))', space: 'O(1)' },
    },
  ],
};
