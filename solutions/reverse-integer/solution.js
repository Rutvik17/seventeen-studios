/**
 * @param {number} x
 * @return {number}
 */
function reverse(x) {
  const MAX = 2 ** 31 - 1;
  const MIN = -(2 ** 31);
  let out = 0;
  while (x !== 0) {
    const d = x % 10; // keeps x's sign, so negatives reverse into negatives
    x = Math.trunc(x / 10);
    // Check before growing: out * 10 + d must stay within 32 bits.
    if (out > Math.trunc(MAX / 10) || (out === Math.trunc(MAX / 10) && d > 7)) return 0; // past 2147483647
    if (out < Math.trunc(MIN / 10) || (out === Math.trunc(MIN / 10) && d < -8)) return 0; // past -2147483648
    out = out * 10 + d;
  }
  return out;
}
