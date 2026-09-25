import type { Category } from './types';

export const stack: Category = {
  slug: 'stack',
  title: 'Stack',
  blurb: 'Last in, first out: keep the things still waiting to be matched or resolved, and deal with the newest first.',
  problems: [
    {
      slug: 'valid-parentheses',
      number: 20,
      title: 'Valid Parentheses',
      difficulty: 'Easy',
      statement: [
        'Given a string `s` of the characters `(`, `)`, `[`, `]`, `{` and `}`, decide whether it is valid.',
        'It is valid when every opening bracket is closed by the same kind of bracket, brackets close in the right order (the most recently opened first), and every closing bracket has an opening one.',
      ],
      constraints: ['1 ≤ s.length ≤ 10⁴', '`s` has only the six bracket characters.'],
      idea: [
        'The bracket that must close next is always the most recently opened one still open. “Most recent first” is exactly what a stack gives.',
        'Push each opening bracket. At a closing bracket, the top of the stack must be its partner: pop it, or fail if it is the wrong kind or the stack is empty. At the end, anything left on the stack was never closed.',
      ],
      complexity: { time: 'O(n)', space: 'O(n) — the stack' },
    },
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
    {
      slug: 'evaluate-reverse-polish-notation',
      number: 150,
      title: 'Evaluate Reverse Polish Notation',
      difficulty: 'Medium',
      statement: [
        'In reverse Polish notation an operator comes after its two operands: `2 1 + 3 *` means (2 + 1) × 3. Given such an expression as a list of `tokens`, return its value.',
        'The operators are `+`, `−`, `×` (written `*`) and `/`. Division between integers truncates toward zero, so 7 / −2 is −3. The expression is always valid.',
      ],
      constraints: ['1 ≤ tokens.length ≤ 10⁴', 'Each token is an operator or an integer in [−200, 200].', 'Every intermediate result fits in 32 bits.'],
      idea: [
        'Read the tokens left to right. A number waits on a stack until an operator needs it. An operator takes the top two numbers — the top one is its right operand, the one beneath its left — and pushes the result back.',
        'When the tokens run out, the one number left on the stack is the value of the whole expression.',
      ],
      complexity: { time: 'O(n)', space: 'O(n) — the stack' },
    },
    {
      slug: 'generate-parentheses',
      number: 22,
      title: 'Generate Parentheses',
      difficulty: 'Medium',
      statement: ['Given `n` pairs of parentheses, return every string of `n` opening and `n` closing parentheses that is well-formed — every `)` closes an earlier `(`.'],
      constraints: ['1 ≤ n ≤ 8'],
      idea: [
        'Build the string one character at a time, and only ever add a character that keeps it valid. An `(` may be added while fewer than `n` have been used. A `)` may be added only while there are more `(` than `)` so far — otherwise it would close nothing.',
        'Trying both choices at each step, and undoing each after exploring it, is backtracking. Because an invalid prefix is never started, every finished string of length `2n` is well-formed, and none is produced twice.',
      ],
      complexity: { time: 'O(4ⁿ / √n) — proportional to the number of answers (the Catalan number) times their length', space: 'O(n) — the recursion and the string being built' },
    },
    {
      slug: 'daily-temperatures',
      number: 739,
      title: 'Daily Temperatures',
      difficulty: 'Medium',
      statement: ['Given daily `temperatures`, return an array `answer` where `answer[i]` is how many days after day `i` you must wait for a warmer day. If no warmer day comes, `answer[i]` is 0.'],
      constraints: ['1 ≤ temperatures.length ≤ 10⁵', '30 ≤ temperatures[i] ≤ 100'],
      idea: [
        'Keep a stack of the days still waiting for a warmer day. Their temperatures only go down from bottom to top: a warmer day would have ended the wait of any cooler day beneath it.',
        'When a new day arrives, it is the answer for every waiting day that is cooler — pop them, recording the distance. Then it joins the stack to wait itself. Each day is pushed once and popped at most once.',
      ],
      complexity: { time: 'O(n)', space: 'O(n) — the stack' },
    },
    {
      slug: 'car-fleet',
      number: 853,
      title: 'Car Fleet',
      difficulty: 'Medium',
      statement: [
        'Cars drive along a one-lane road toward mile `target`. Car `i` starts at `position[i]` and drives at `speed[i]` miles per hour.',
        'A car can never pass another. When it catches up with a slower car it slows down and they drive on together as one fleet (a car on its own is a fleet too). Catching up exactly at the target still counts as one fleet. How many fleets arrive?',
      ],
      constraints: ['1 ≤ n ≤ 10⁵', '0 < target ≤ 10⁶', '0 ≤ position[i] < target, all different', '0 < speed[i] ≤ 10⁶'],
      idea: [
        'Only the car directly ahead matters, so take the cars in order of position, nearest the target first. Each would arrive, on its own, at time `(target − position) ÷ speed`.',
        'If a car would arrive later than the fleet just ahead of it, it can never catch that fleet: it leads a new one. If it would arrive sooner or at the same moment, it catches up and simply joins — the fleet still arrives at the slower time. Count the new fleets.',
      ],
      complexity: { time: 'O(n log n) — sorting by position', space: 'O(n)' },
    },
    {
      slug: 'largest-rectangle-in-histogram',
      number: 84,
      title: 'Largest Rectangle in Histogram',
      difficulty: 'Hard',
      statement: ['Given `heights`, the bar heights of a histogram whose bars are each 1 wide, return the area of the largest rectangle that fits inside it.'],
      constraints: ['1 ≤ heights.length ≤ 10⁵', '0 ≤ heights[i] ≤ 10⁴'],
      idea: [
        'The largest rectangle is as tall as some bar, and stretches left and right from it until a shorter bar stops it. So for each bar we need where it starts and where it is cut off.',
        'Keep a stack of bars in increasing height, each with the leftmost index it can reach. When a shorter bar arrives, every taller bar on the stack is cut off here: pop it and measure `height × (i − start)`. The new bar can reach back to the start of the last bar it popped. A final bar of height 0 cuts off everything left.',
      ],
      complexity: { time: 'O(n) — each bar is pushed and popped once', space: 'O(n)' },
    },
  ],
};
