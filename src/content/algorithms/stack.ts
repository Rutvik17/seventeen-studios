import type { Category } from './types';

export const stack: Category = {
  slug: 'stack',
  title: 'Stack',
  blurb: 'Last in, first out: keep the things still waiting to be matched or resolved, and deal with the newest first.',
  problems: [
    {
      slug: 'min-stack',
      number: 155,
      title: 'Min Stack',
      difficulty: 'Medium',
      statement: [
        'Design a stack — a pile where you add to and remove from the top — that can also report its smallest element at any moment.',
        'Implement `MinStack` with `push(val)` to add a value, `pop()` to remove the top, `top()` to read the top, and `getMin()` to return the smallest value currently in the stack. Every operation must take constant time.',
      ],
      constraints: ['−2³¹ ≤ val ≤ 2³¹ − 1', '`pop`, `top` and `getMin` are only called on a non-empty stack.', 'At most 3 × 10⁴ calls in total.'],
      idea: [
        'The minimum only changes when something is pushed or popped, and a pop always removes the newest thing. So each entry can carry, alongside its value, “the smallest value from here down”.',
        'Pushing `v` stores `(v, min(v, the minimum below it))`. Popping removes the pair, and the pair underneath still knows its own minimum. `getMin` just reads the top pair.',
      ],
      complexity: { time: 'O(1) for every operation', space: 'O(n) — one pair per element' },
    },
  ],
};
