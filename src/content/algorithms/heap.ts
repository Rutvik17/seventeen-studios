import type { Category } from './types';

export const heap: Category = {
  slug: 'heap',
  title: 'Heap / Priority Queue',
  blurb: 'A heap always knows its smallest (or largest) item, and adding or removing one costs only log n — the tool for “the best k” and “what comes next”.',
  problems: [
    {
      slug: 'kth-largest-element-in-a-stream',
      number: 703,
      title: 'Kth Largest Element in a Stream',
      difficulty: 'Easy',
      statement: [
        'Design a class that is given a number `k` and a starting list of numbers `nums`. Each call to `add(val)` adds one more number and returns the `k`-th largest of all the numbers so far (counting repeats).',
      ],
      constraints: ['0 ≤ nums.length ≤ 10⁴', '1 ≤ k ≤ nums.length + 1', '−10⁴ ≤ nums[i], val ≤ 10⁴', 'At most 10⁴ calls to `add`.'],
      idea: [
        'A min-heap is a binary tree kept so every parent is no larger than its children: the smallest item is always at the top, and adding or removing an item takes log n steps, a swap per level.',
        'Keep only the k largest numbers seen, in a min-heap. The smallest of those k — the top — is exactly the k-th largest. When a new number arrives, add it; if the heap now holds k + 1, remove the top, which can no longer be among the k largest.',
      ],
      complexity: { time: 'O(log k) per add', space: 'O(k)' },
    },
    {
      slug: 'last-stone-weight',
      number: 1046,
      title: 'Last Stone Weight',
      difficulty: 'Easy',
      statement: [
        'You have stones with weights `stones[i]`. Each turn, take the two heaviest, `y ≥ x`, and smash them: if they weigh the same, both are destroyed; otherwise the lighter is destroyed and the heavier now weighs `y − x`.',
        'When at most one stone is left, return its weight, or 0 if none is.',
      ],
      constraints: ['1 ≤ stones.length ≤ 30', '1 ≤ stones[i] ≤ 1000'],
      idea: [
        'Every turn needs the two heaviest stones, and may put a new stone back. A max-heap — the largest always on top — gives exactly that: remove the top twice, and push the difference back if it is not zero.',
        'Each turn removes at least one stone, so there are at most n turns, each costing log n.',
      ],
      complexity: { time: 'O(n log n)', space: 'O(n) — the heap' },
    },
    {
      slug: 'k-closest-points-to-origin',
      number: 973,
      title: 'K Closest Points to Origin',
      difficulty: 'Medium',
      statement: ['Given a list of points `[x, y]` on a plane and a number `k`, return the `k` points closest to the origin `(0, 0)`, in any order. The answer is guaranteed to be unique.'],
      constraints: ['1 ≤ k ≤ points.length ≤ 10⁴', '−10⁴ ≤ x, y ≤ 10⁴'],
      idea: [
        'The distance from the origin is √(x² + y²). Taking a square root never changes which of two numbers is bigger, so compare `x² + y²` instead: for (1, 3) that is 1 + 9 = 10, for (−2, 2) it is 4 + 4 = 8, so (−2, 2) is closer.',
        'Keep the k closest points so far in a max-heap by that squared distance: the farthest of them is on top. Add each point; when there are k + 1, remove the top — the farthest cannot be among the k closest. What remains is the answer.',
      ],
      complexity: { time: 'O(n log k)', space: 'O(k)' },
    },
    {
      slug: 'kth-largest-element-in-an-array',
      number: 215,
      title: 'Kth Largest Element in an Array',
      difficulty: 'Medium',
      statement: ['Given an integer array `nums` and a number `k`, return the `k`-th largest element — the one that would be `k`-th from the end if the array were sorted, so repeats count. Try to do it without sorting.'],
      constraints: ['1 ≤ k ≤ nums.length ≤ 10⁵', '−10⁴ ≤ nums[i] ≤ 10⁴'],
      idea: [
        'The k-th largest is the element that would sit at position `n − k` in sorted order. Quickselect finds it without sorting the rest: pick a pivot value and partition the array into three blocks — smaller than the pivot, equal to it, larger than it.',
        'Now only one block can hold position `n − k`: if it falls in the equal block, the pivot is the answer; otherwise repeat inside the block that holds it, and ignore the other two. Each round keeps, on average, about half, so the work is n + n/2 + n/4 + … ≈ 2n. Choosing the pivot at random means no input can make every choice bad; the three-way split keeps runs of equal values from slowing it down.',
      ],
      complexity: { time: 'O(n) on average; O(n²) in the worst case, which a random pivot makes vanishingly rare', space: 'O(1) — partitions in place' },
    },
    {
      slug: 'task-scheduler',
      number: 621,
      title: 'Task Scheduler',
      difficulty: 'Medium',
      statement: [
        'A CPU must run a list of tasks, each labelled with a letter A–Z. Every task takes one time unit. Two tasks with the same label must be at least `n` time units apart; in between, the CPU runs other tasks or sits idle.',
        'Return the least number of time units needed to finish every task.',
      ],
      constraints: ['1 ≤ tasks.length ≤ 10⁴', 'Each task is an uppercase English letter.', '0 ≤ n ≤ 100'],
      idea: [
        'The commonest task sets the pace. If it occurs `most` times, its runs need `most − 1` gaps of `n` between them: picture `most − 1` frames of `n + 1` slots, each starting with that task, then one final slot for its last run. Every other task that also occurs `most` times adds one more slot at the end. That is `(most − 1) × (n + 1) + tied` units, where `tied` counts the tasks occurring `most` times.',
        'The other tasks fill the idle slots inside the frames. If there are more of them than idle slots, the frames simply stretch and no idle time is needed at all — the answer is then just the number of tasks. So the answer is the larger of the two. With `A A A B B B` and n = 2: (3 − 1) × 3 + 2 = 8, as in `A B _ A B _ A B`.',
      ],
      complexity: { time: 'O(n) — one count of the tasks', space: 'O(1) — 26 counters' },
    },
    {
      slug: 'design-twitter',
      number: 355,
      title: 'Design Twitter',
      difficulty: 'Medium',
      statement: [
        'Design a small Twitter. `postTweet(userId, tweetId)` posts a tweet; `follow(followerId, followeeId)` and `unfollow(followerId, followeeId)` change who follows whom.',
        '`getNewsFeed(userId)` returns the ids of the 10 most recent tweets posted by the user or by anyone they follow, newest first.',
      ],
      constraints: ['1 ≤ userId, followerId, followeeId ≤ 500', '0 ≤ tweetId ≤ 10⁴', 'Every tweet has a different id.', 'At most 3 × 10⁴ calls in total.'],
      idea: [
        'Give every tweet a time from a counter that rises by one per post. Each user keeps their own tweets in posting order, so each list is already sorted by time.',
        'A feed is then the newest 10 across several sorted lists — the Merge k Sorted Lists problem, stopped after 10. Put each relevant user’s newest tweet in a max-heap by time; take the top, and push that user’s next older tweet in its place. With f users followed, a feed costs 10 heap steps, not a sort of everything they ever posted.',
      ],
      complexity: { time: 'O(1) to post or follow; O(f + 10 log f) per feed', space: 'O(tweets + follows)' },
    },
    {
      slug: 'find-median-from-data-stream',
      number: 295,
      title: 'Find Median from Data Stream',
      difficulty: 'Hard',
      statement: [
        'The median of a list of numbers is the middle one once they are sorted; with an even count, it is the average of the two middle ones — the median of 2, 3, 4 is 3, of 2, 3 is 2.5.',
        'Design `addNum(num)`, which adds a number, and `findMedian()`, which returns the median of all numbers added so far.',
      ],
      constraints: ['−10⁵ ≤ num ≤ 10⁵', '`findMedian` is only called after at least one number is added.', 'At most 5 × 10⁴ calls in total.'],
      idea: [
        'The median only needs the one or two numbers in the middle. Split the numbers into a lower half and an upper half: keep the lower half in a max-heap (its largest on top) and the upper half in a min-heap (its smallest on top). The two tops are the middle.',
        'Keep the halves the same size, or the lower one bigger by one. To add a number, push it into the lower half, then move the lower half’s largest into the upper half — so everything below stays below everything above — and if the upper half is now bigger, move its smallest back. The median is the lower top, or the average of both tops.',
      ],
      complexity: { time: 'O(log n) to add, O(1) to find', space: 'O(n)' },
    },
  ],
};
