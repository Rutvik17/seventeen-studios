import type { Category } from './types';

export const linkedList: Category = {
  slug: 'linked-list',
  title: 'Linked List',
  blurb: 'Nodes that know only the next one: every trick is about which arrows to redirect, in what order, without losing the rest of the chain.',
  problems: [
    {
      slug: 'reverse-linked-list',
      number: 206,
      title: 'Reverse Linked List',
      difficulty: 'Easy',
      statement: [
        'A singly linked list is a chain of nodes, each holding a value and an arrow (`next`) to the node after it; the last one points to nothing. Given the first node, `head`, reverse the list and return its new first node.',
      ],
      constraints: ['0 ≤ number of nodes ≤ 5000', '−5000 ≤ Node.val ≤ 5000'],
      idea: [
        'Reversing the list means turning every arrow round. Walk it with two pointers: `prev`, the part already reversed, and `cur`, the node being turned.',
        'At each node, first save `cur.next` — once the arrow is changed it is the only way to reach the rest — then point `cur.next` at `prev`, and step both pointers forward. When `cur` falls off the end, `prev` is the old last node: the new head.',
      ],
      complexity: { time: 'O(n) — each arrow is turned once', space: 'O(1) — three pointers' },
    },
    {
      slug: 'merge-two-sorted-lists',
      number: 21,
      title: 'Merge Two Sorted Lists',
      difficulty: 'Easy',
      statement: ['Given the heads of two linked lists, `list1` and `list2`, each already sorted from smallest to largest, splice their nodes into one sorted list and return its head.'],
      constraints: ['0 ≤ nodes in each list ≤ 50', '−100 ≤ Node.val ≤ 100', 'Both lists are sorted in non-decreasing order.'],
      idea: [
        'The smallest node overall is the smaller of the two fronts. Take it, and the question repeats on what is left — so walk both lists at once, always taking the smaller front.',
        'A dummy node — a placeholder at the start of the answer — means the first node needs no special case: `tail` starts on the dummy and each chosen node is hung after it. When one list runs out, the rest of the other is already sorted and is attached in one step.',
      ],
      complexity: { time: 'O(n + m) — each node is taken once', space: 'O(1) — the nodes are relinked, not copied' },
    },
    {
      slug: 'reorder-list',
      number: 143,
      title: 'Reorder List',
      difficulty: 'Medium',
      statement: [
        'A list runs L₀ → L₁ → … → Lₙ₋₁ → Lₙ. Rearrange its nodes, in place, into L₀ → Lₙ → L₁ → Lₙ₋₁ → L₂ → Lₙ₋₂ → … — first, last, second, second-to-last, and so on.',
        'Only the arrows may change, not the values in the nodes.',
      ],
      constraints: ['1 ≤ number of nodes ≤ 5 × 10⁴', '1 ≤ Node.val ≤ 1000'],
      idea: [
        'The answer takes alternately from the front half going forward and from the back half going backward. A singly linked list cannot go backward — so reverse the back half first.',
        'Three steps. Find the middle with a slow pointer (one node a step) and a fast one (two a step): when fast reaches the end, slow is halfway. Cut there and reverse the second half. Then weave: one node from the front, one from the reversed back, until the back runs out.',
      ],
      complexity: { time: 'O(n) — three passes', space: 'O(1) — only arrows move' },
    },
    {
      slug: 'remove-nth-node-from-end-of-list',
      number: 19,
      title: 'Remove Nth Node From End of List',
      difficulty: 'Medium',
      statement: ['Given the head of a linked list, remove the `n`-th node counting from the end (the last node is the 1st from the end), and return the head.'],
      constraints: ['1 ≤ number of nodes ≤ 30', '0 ≤ Node.val ≤ 100', '1 ≤ n ≤ number of nodes'],
      idea: [
        'Counting the list first and then walking again takes two passes. Instead, keep two pointers exactly `n + 1` nodes apart: when the front one runs off the end, the back one stands just before the node to remove.',
        'Both start on a dummy node placed before the head, so removing the head itself is not a special case. Move the front one `n + 1` steps, then both together until the front one is past the end; then skip the next node with `slow.next = slow.next.next`.',
      ],
      complexity: { time: 'O(n) — one pass', space: 'O(1)' },
    },
    {
      slug: 'copy-list-with-random-pointer',
      number: 138,
      title: 'Copy List with Random Pointer',
      difficulty: 'Medium',
      statement: [
        'Each node of this list has a second arrow, `random`, which can point to any node in the list or to nothing. Build a deep copy: brand-new nodes with the same values, whose `next` and `random` arrows point between the new nodes in exactly the same pattern. No arrow in the copy may point into the original.',
        'Here a list is written as `[val, random_index]` for each node, where `random_index` is the position of the node its random arrow points to, or null.',
      ],
      constraints: ['0 ≤ number of nodes ≤ 1000', '−10⁴ ≤ Node.val ≤ 10⁴', '`random` is null or points to a node in the list.'],
      idea: [
        'The hard part is `random`: when a copy is made, the copy of its random target may not exist yet. A hash map from each original to its copy solves this in two passes, at the cost of O(n) memory.',
        'Without the map: weave each copy right after its original, A → A′ → B → B′. Now the copy of any node X is simply `X.next`, so a copy’s random is `original.random.next`. Finally unweave the two lists, restoring the original.',
      ],
      complexity: { time: 'O(n) — three passes', space: 'O(1) besides the copy itself' },
    },
    {
      slug: 'add-two-numbers',
      number: 2,
      title: 'Add Two Numbers',
      difficulty: 'Medium',
      statement: [
        'Two non-negative whole numbers are stored as linked lists, one digit per node, with the ones digit first: 342 is the list 2 → 4 → 3. Return their sum as a list in the same form.',
        'Neither number has leading zeros, except the number 0 itself.',
      ],
      constraints: ['1 ≤ nodes in each list ≤ 100', '0 ≤ Node.val ≤ 9'],
      idea: [
        'This is addition as taught at school, column by column from the ones — and the lists already hand over the digits in that order.',
        'Walk both lists together. In each column add the two digits (0 if a list has ended) and the carry from the column before: the new digit is `sum mod 10` and the carry is `sum ÷ 10`, rounded down. Keep going while either list has digits or the carry is 1 — 5 + 5 needs a last node for the 1 in 10.',
      ],
      complexity: { time: 'O(max(n, m)) — one column per digit', space: 'O(max(n, m)) — the answer’s digits' },
    },
    {
      slug: 'linked-list-cycle',
      number: 141,
      title: 'Linked List Cycle',
      difficulty: 'Easy',
      statement: [
        'Given the head of a linked list, return `true` if it has a cycle — some node whose `next` arrows, followed along, eventually lead back to it — and `false` if the list ends.',
        'Here the input is the values and `pos`, the position the last node’s arrow points back to (−1 for none). The code only ever receives `head`.',
      ],
      constraints: ['0 ≤ number of nodes ≤ 10⁴', '−10⁵ ≤ Node.val ≤ 10⁵', '`pos` is −1 or a valid position.'],
      idea: [
        'A set of visited nodes would find the repeat, but costs memory. Floyd’s tortoise and hare uses none: `slow` moves one node a step, `fast` two.',
        'If the list ends, fast reaches the end first: no cycle. If there is a cycle, both end up going round it, and each step fast gains exactly one node on slow — so the gap shrinks by one every step and it must reach zero: they meet.',
      ],
      complexity: { time: 'O(n) — they meet within one lap of the cycle', space: 'O(1)' },
    },
    {
      slug: 'find-the-duplicate-number',
      number: 287,
      title: 'Find the Duplicate Number',
      difficulty: 'Medium',
      statement: [
        'An array `nums` holds `n + 1` integers, each between 1 and `n`. Exactly one value is repeated (possibly many times). Return it.',
        'The array may not be modified, and only a constant amount of extra memory may be used.',
      ],
      constraints: ['1 ≤ n ≤ 10⁵', '`nums.length` is n + 1', '1 ≤ nums[i] ≤ n', 'Exactly one value appears more than once.'],
      idea: [
        'Read the array as a linked list: from index `i` go to index `nums[i]`. Starting at 0 (which no value points to, since values are at least 1), the walk must loop, because there are finitely many indices. The loop is entered at an index that two different positions point to — that index is the repeated value.',
        'Floyd’s algorithm finds a loop’s entrance with O(1) memory. First, slow and fast (one and two steps) meet somewhere inside the loop. Then restart slow at 0 and move both one step at a time: they meet exactly at the entrance. (Why: say the entrance is t steps from 0 and the loop is c long. When they meet, fast has walked twice as far as slow, and the extra distance is whole laps — so slow’s distance, t plus however far it is past the entrance, is a whole number of laps. From the meeting point, then, t more steps land exactly on the entrance.)',
      ],
      complexity: { time: 'O(n)', space: 'O(1) — two indices' },
    },
    {
      slug: 'lru-cache',
      number: 146,
      title: 'LRU Cache',
      difficulty: 'Medium',
      statement: [
        'Design a cache that holds at most `capacity` key–value pairs. `get(key)` returns the value, or −1 if the key is absent. `put(key, value)` inserts or updates the pair; if that makes the cache too big, the least recently used key — the one read or written longest ago — is thrown out.',
        'Both operations must take O(1) time on average.',
      ],
      constraints: ['1 ≤ capacity ≤ 3000', '0 ≤ key ≤ 10⁴', '0 ≤ value ≤ 10⁵', 'At most 2 × 10⁵ calls.'],
      idea: [
        'Two needs, two structures. Finding a key fast needs a hash map. Keeping keys in order of use — and moving any key to the “just used” end in one step — needs a doubly linked list, whose nodes point both forward and back so one can be unlinked without a search.',
        'The map takes each key to its node in the list. Every `get` or `put` unlinks the node and puts it at the most-recent end; when the cache overflows, the node at the least-recent end is removed from both. Two dummy nodes at the ends mean no step ever checks for an empty list.',
      ],
      complexity: { time: 'O(1) per operation', space: 'O(capacity)' },
    },
    {
      slug: 'merge-k-sorted-lists',
      number: 23,
      title: 'Merge k Sorted Lists',
      difficulty: 'Hard',
      statement: ['Given an array of `k` linked lists, each sorted from smallest to largest, merge them all into one sorted list and return it.'],
      constraints: ['0 ≤ k ≤ 10⁴', '0 ≤ each list’s length ≤ 500', '−10⁴ ≤ Node.val ≤ 10⁴', 'The lists hold at most 10⁴ nodes in total.'],
      idea: [
        'As with two lists, the next node is always the smallest of the fronts — but now there are `k` fronts, and scanning them all each time costs k per node.',
        'A min-heap is a tree kept so its smallest item is always on top, with insert and remove-smallest each costing log k. Put each list’s front in it. Repeatedly take the smallest, attach it to the answer, and push the next node from the same list. With N nodes in all, that is N log k.',
      ],
      complexity: { time: 'O(N log k) — N nodes, each through a heap of at most k', space: 'O(k) — the heap' },
    },
    {
      slug: 'reverse-nodes-in-k-group',
      number: 25,
      title: 'Reverse Nodes in k-Group',
      difficulty: 'Hard',
      statement: [
        'Given the head of a linked list and a number `k`, reverse the nodes `k` at a time and return the new head. If the number of nodes left at the end is less than `k`, they stay as they are.',
        'Only the arrows may change, not the values.',
      ],
      constraints: ['1 ≤ k ≤ number of nodes ≤ 5000', '0 ≤ Node.val ≤ 1000'],
      idea: [
        'Handle one group at a time. `before` is the node just ahead of the group (a dummy node at first). Walk `k` nodes from it to find the group’s last node, `end`; if the list runs out first, stop — the rest stays.',
        'Reverse the group as in Reverse Linked List, but start `prev` at the node after the group rather than at nothing, so the reversed group’s tail is already attached to the rest. Then point `before` at `end`, the group’s new first node, and move `before` to the old first node, now last.',
      ],
      complexity: { time: 'O(n) — each node is counted and turned a constant number of times', space: 'O(1)' },
    },
  ],
};
