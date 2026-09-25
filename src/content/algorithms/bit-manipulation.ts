import type { Category } from './types';

export const bitManipulation: Category = {
  slug: 'bit-manipulation',
  title: 'Bit Manipulation',
  blurb: 'Numbers are rows of 0s and 1s, and a handful of operations — AND, OR, XOR, shifts — work on every bit at once.',
  problems: [
    {
      slug: 'single-number',
      number: 136,
      title: 'Single Number',
      difficulty: 'Easy',
      statement: ['In a non-empty array of integers, every value appears twice except one, which appears once. Find it, in linear time and constant extra space.'],
      constraints: ['1 ≤ nums.length ≤ 3 × 10⁴', '−3 × 10⁴ ≤ nums[i] ≤ 3 × 10⁴', 'Exactly one value appears once; every other appears twice.'],
      idea: [
        'XOR (written `^`) compares two numbers bit by bit: a bit of the result is 1 where the two bits differ. So x ^ x = 0 (every bit matches itself), x ^ 0 = x, and the order of XORs does not matter.',
        'XOR everything together. Each value that appears twice meets its twin and cancels to 0, wherever they are in the array; what remains is the single one. For [4, 1, 2, 1, 2]: 4 ^ (1 ^ 1) ^ (2 ^ 2) = 4.',
      ],
      complexity: { time: 'O(n)', space: 'O(1)' },
    },
    {
      slug: 'number-of-1-bits',
      number: 191,
      title: 'Number of 1 Bits',
      difficulty: 'Easy',
      statement: ['Return how many bits of the positive integer `n` are 1 in its binary form (its “Hamming weight”). 11 is 1011 in binary: three 1s.'],
      constraints: ['1 ≤ n ≤ 2³¹ − 1'],
      idea: [
        'Subtracting 1 flips the lowest 1 bit to 0 and every 0 below it to 1: 1100 − 1 = 1011. AND (`&`, 1 only where both bits are 1) of n and n − 1 therefore keeps everything above that bit and clears the rest: 1100 & 1011 = 1000.',
        'So `n &= n − 1` removes exactly one 1 bit. Count how many times it runs before n is 0. It loops once per 1 bit, not once per bit.',
      ],
      complexity: { time: 'O(number of 1 bits) — at most 31', space: 'O(1)' },
    },
    {
      slug: 'counting-bits',
      number: 338,
      title: 'Counting Bits',
      difficulty: 'Easy',
      statement: ['Given `n`, return an array whose element `i` is the number of 1 bits in `i`, for every i from 0 to `n`. Try to do it in a single pass.'],
      constraints: ['0 ≤ n ≤ 10⁵'],
      idea: [
        'Shifting right by one (`i >> 1`) drops i’s last bit: 1101 becomes 110. So i has the same 1 bits as i >> 1, plus its own last bit, which is `i & 1`.',
        'And i >> 1 is smaller than i, so its count is already in the array: ones[i] = ones[i >> 1] + (i & 1). For 5 (101): ones[2] (10, one bit) + 1 = 2.',
      ],
      complexity: { time: 'O(n)', space: 'O(1) besides the answer' },
    },
    {
      slug: 'reverse-bits',
      number: 190,
      title: 'Reverse Bits',
      difficulty: 'Easy',
      statement: ['Reverse the order of the 32 bits of the number `n`, read as an unsigned integer (every bit a digit, none a sign), and return the result.'],
      constraints: ['`n` fits in 32 bits.'],
      idea: [
        'Build the answer one bit at a time. Take n’s lowest bit (`n & 1`), shift the answer left to make room, and put the bit in at its low end; then shift n right to bring up its next bit.',
        'The bit taken first — n’s lowest — has been shifted left 31 times by the end, so it lands at the top: exactly the reversal. Reading the result as unsigned matters where a language’s int would otherwise call the top bit a minus sign.',
      ],
      complexity: { time: 'O(1) — always 32 steps', space: 'O(1)' },
    },
    {
      slug: 'missing-number',
      number: 268,
      title: 'Missing Number',
      difficulty: 'Easy',
      statement: ['An array holds `n` different numbers taken from 0 to `n` — so exactly one is missing. Return it.'],
      constraints: ['1 ≤ n ≤ 10⁴', '0 ≤ nums[i] ≤ n', 'All the numbers are different.'],
      idea: [
        'XOR together every number from 0 to n and every number in the array. Each number that is present appears twice — once in each list — and cancels, as in Single Number. The missing one appears only once, so it is what remains.',
        'Pairing each index `i` with the value `nums[i]` in one loop covers 0 to n − 1, and starting from n covers the last one. (Adding them up and subtracting also works, but the sum can overflow; XOR cannot.)',
      ],
      complexity: { time: 'O(n)', space: 'O(1)' },
    },
    {
      slug: 'sum-of-two-integers',
      number: 371,
      title: 'Sum of Two Integers',
      difficulty: 'Medium',
      statement: ['Return `a + b` without using the operators `+` or `−`.'],
      constraints: ['−1000 ≤ a, b ≤ 1000'],
      idea: [
        'Adding in binary, each column gives a sum bit and maybe a carry. The sum bits without carries are exactly `a ^ b` (1 where the bits differ). A carry comes from a column where both bits are 1 — `a & b` — and belongs one column to the left: `(a & b) << 1`.',
        'So a + b = (a ^ b) + ((a & b) << 1). That is another addition, so repeat it with those two numbers; each round pushes the carries further left, and they run out within 32 rounds. Negative numbers work unchanged in two’s complement, the way computers store them — in Python, whose integers never overflow, the answer is kept to 32 bits with a mask and its top bit read back as the sign.',
      ],
      complexity: { time: 'O(1) — at most 32 rounds', space: 'O(1)' },
    },
    {
      slug: 'reverse-integer',
      number: 7,
      title: 'Reverse Integer',
      difficulty: 'Medium',
      statement: [
        'Reverse the digits of a signed 32-bit integer `x`: 123 becomes 321, −123 becomes −321, 120 becomes 21. If the result falls outside the 32-bit range, from −2³¹ to 2³¹ − 1, return 0.',
        'Assume the machine cannot store 64-bit integers, so the overflow must be caught before it happens.',
      ],
      constraints: ['−2³¹ ≤ x ≤ 2³¹ − 1'],
      idea: [
        'Pop digits off the end of x with `% 10` and `/ 10`, and push them onto the answer with `out × 10 + d`.',
        'The only danger is that last push. The 32-bit limit is 2,147,483,647, so before pushing, check: if `out` is already more than 214,748,364, times ten is too big; if it equals 214,748,364, the new digit may be at most 7. The negative side is the same with −214,748,364 and −8. Checking first means the overflow never happens.',
      ],
      complexity: { time: 'O(log x) — one step per digit', space: 'O(1)' },
    },
  ],
};
