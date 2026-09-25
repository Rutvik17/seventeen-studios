import { Rec, arr, bits, vars, marks, type Tracer, type Role } from '../trace';

/** A number's low `w` bits, most significant first. */
const b = (x: number, w: number) => Array.from({ length: w }, (_, i) => (x >>> (w - 1 - i)) & 1);
/** Enough bits to show every number given (at least 4). */
const width = (...xs: number[]) => Math.max(4, ...xs.map((x) => (x >>> 0).toString(2).length));
const diff = (x: number[], y: number[]): Record<number, Role> => Object.fromEntries(x.map((v, i) => [i, v !== y[i] ? 'active' : 'done']).filter(([, r]) => r === 'active'));

export const traces: Record<string, Tracer> = {
  'single-number': ([nums]: [number[]]) => {
    const R = new Rec();
    const w = width(...nums.map((x) => Math.abs(x)));
    let out = 0;
    R.add('XOR everything: equal values cancel wherever they sit, and the single one is left.', arr(nums, { label: 'nums' }), bits([{ label: 'so far', bits: b(out, w) }]));
    nums.forEach((x, i) => {
      const before = out;
      out ^= x;
      R.add(`${before} ^ ${x} = ${out}: bits flip where ${x} has a 1.`, arr(nums, { label: 'nums', marks: marks([i, 'active']) }), bits([{ label: String(before), bits: b(before, w) }, { label: `^ ${x}`, bits: b(x, w), marks: Object.fromEntries(b(x, w).map((v, k) => [k, v ? 'active' : 'done'])) }, { label: `= ${out}`, bits: b(out, w), marks: diff(b(out, w), b(before, w)) }]));
    });
    R.add(`Every pair cancelled: ${out} is the single one.`, vars({ answer: [out, 'found'] }));
    return R.done(out);
  },

  'number-of-1-bits': ([n0]: [number]) => {
    const R = new Rec();
    const w = width(n0);
    let n = n0;
    let count = 0;
    R.add(`${n0} in binary: ${n0.toString(2)}. Each n & (n − 1) clears the lowest 1.`, bits([{ label: String(n0), bits: b(n0, w) }]), vars({ count }));
    while (n) {
      const m = n - 1;
      const next = n & m;
      count++;
      R.add(`n − 1 flips the lowest 1 and the 0s below it; AND keeps only the bits both share. One 1 bit gone: ${count} counted.`, bits([{ label: 'n', bits: b(n, w) }, { label: 'n − 1', bits: b(m, w), marks: diff(b(m, w), b(n, w)) }, { label: 'n & (n − 1)', bits: b(next, w), marks: diff(b(next, w), b(n, w)) }]), vars({ count: [count, 'active'] }));
      n = next;
    }
    R.add(`n is 0: ${count} one-bit${count === 1 ? '' : 's'}.`, vars({ answer: [count, 'found'] }));
    return R.done(count);
  },

  'counting-bits': ([n]: [number]) => {
    const R = new Rec();
    const ones = new Array(n + 1).fill(0);
    const w = width(n);
    R.add('0 has no 1 bits. For each i after it: the count for i with its last bit dropped, plus that last bit.', arr([0], { label: 'ones[i]', index: true }));
    for (let i = 1; i <= n; i++) {
      ones[i] = ones[i >> 1] + (i & 1);
      R.add(`${i} = ${i.toString(2)}: drop the last bit to get ${i >> 1} (${ones[i >> 1]} one${ones[i >> 1] === 1 ? '' : 's'}), add the last bit ${i & 1}: ${ones[i]}.`, bits([{ label: String(i), bits: b(i, w), marks: { [w - 1]: i & 1 ? 'found' : 'done' } }, { label: `${i} >> 1`, bits: b(i >> 1, w) }]), arr(ones.slice(0, i + 1), { label: 'ones[i]', index: true, marks: marks([i, 'active'], [i >> 1, 'compare']) }));
    }
    return R.done(ones);
  },

  'reverse-bits': ([n0]: [number]) => {
    const R = new Rec();
    let n = n0 >>> 0;
    let out = 0;
    R.add('Take the lowest bit of n, shift the answer left, drop the bit in; 32 times.', bits([{ label: 'n', bits: b(n, 32) }, { label: 'answer', bits: b(out, 32) }]));
    for (let i = 0; i < 32; i++) {
      const bit = n & 1;
      out = ((out << 1) | bit) >>> 0;
      n >>>= 1;
      if (i < 8 || i >= 28) R.add(`Step ${i + 1}: n’s lowest bit is ${bit}; it goes in at the answer’s low end.${i === 7 ? ' (The same for the next 20 steps.)' : ''}`, bits([{ label: 'n', bits: b(n, 32) }, { label: 'answer', bits: b(out, 32), marks: { 31: bit ? 'found' : 'active' } }]));
    }
    R.add(`Reversed: ${out}.`, bits([{ label: String(n0 >>> 0), bits: b(n0 >>> 0, 32) }, { label: String(out), bits: b(out, 32), marks: Object.fromEntries(b(out, 32).map((v, k) => [k, v ? 'found' : 'done'])) }]), vars({ answer: [out, 'found'] }));
    return R.done(out);
  },

  'missing-number': ([nums]: [number[]]) => {
    const R = new Rec();
    let out = nums.length;
    R.add(`Start with n = ${nums.length}. XOR in every index and every value: each number present shows up twice and cancels.`, arr(nums, { label: 'nums', index: true }), vars({ xor: out }));
    nums.forEach((x, i) => {
      const before = out;
      out ^= i ^ x;
      R.add(`${before} ^ index ${i} ^ value ${x} = ${out}.`, arr(nums, { label: 'nums', index: true, marks: marks([i, 'active']) }), vars({ xor: [out, 'active'] }));
    });
    R.add(`Everything present has cancelled: ${out} is missing.`, vars({ answer: [out, 'found'] }));
    return R.done(out);
  },

  'sum-of-two-integers': ([a0, b0]: [number, number]) => {
    const R = new Rec();
    let a = a0 | 0;
    let c = b0 | 0;
    const w = Math.min(32, Math.max(8, width(Math.abs(a0), Math.abs(b0)) + 2));
    const rows = (x: number, y: number) => [
      { label: `a = ${x}`, bits: b(x, w) },
      { label: `b = ${y}`, bits: b(y, w) },
    ];
    R.add(`Add ${a0} + ${b0} without +: XOR adds each column without carrying; AND finds the columns that carry, and << 1 moves the carry left.${a0 < 0 || b0 < 0 ? ' (Negative numbers are stored in two’s complement; the lowest bits are shown.)' : ''}`, bits(rows(a, c)));
    let round = 0;
    while (c !== 0) {
      round++;
      const sum = a ^ c;
      const carry = (a & c) << 1;
      R.add(`Round ${round}: a ^ b = ${sum} (no carries), (a & b) << 1 = ${carry} (the carries). Add those two next.`, bits([...rows(a, c), { label: 'a ^ b', bits: b(sum, w), marks: Object.fromEntries(b(sum, w).map((v, k) => [k, v ? 'found' : 'done'])) }, { label: '(a & b) << 1', bits: b(carry, w), marks: Object.fromEntries(b(carry, w).map((v, k) => [k, v ? 'active' : 'done'])) }]));
      a = sum;
      c = carry;
    }
    R.add(`No carry left: ${a0} + ${b0} = ${a}.`, bits(rows(a, c)), vars({ answer: [a, 'found'] }));
    return R.done(a);
  },

  'reverse-integer': ([x0]: [number]) => {
    const R = new Rec();
    const MAX = 2 ** 31 - 1;
    const MIN = -(2 ** 31);
    let x = x0;
    let out = 0;
    R.add(`Pop digits off the end of ${x0} and push them onto the answer — checking the 32-bit limits (${MAX} and ${MIN}) before every push.`, arr([...String(Math.abs(x0))].map(Number), { label: String(x0) }), vars({ out }));
    while (x !== 0) {
      const d = x % 10;
      x = Math.trunc(x / 10);
      const hi = Math.trunc(MAX / 10);
      const lo = Math.trunc(MIN / 10);
      if (out > hi || (out === hi && d > 7) || out < lo || (out === lo && d < -8)) {
        R.add(`Pushing ${d} onto ${out} would pass the 32-bit limit: return 0.`, vars({ out: [out, 'bad'], digit: d, answer: [0, 'bad'] }));
        return R.done(0);
      }
      out = out * 10 + d;
      R.add(`Pop ${d}; ${out === d ? `start with ${d}` : `${(out - d) / 10} × 10 + ${d} = ${out}`}.`, arr(x === 0 ? ['∅'] : [...String(Math.abs(x))].map(Number), { label: 'digits left' }), vars({ out: [out, 'active'] }));
    }
    R.add(`Every digit moved: ${out}.`, vars({ answer: [out, 'found'] }));
    return R.done(out);
  },
};
