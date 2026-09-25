/**
 * @param {number} n
 * @return {number[]}
 */
function countBits(n) {
  // i >> 1 is i without its last bit, and already counted; add that last bit back.
  const ones = new Array(n + 1).fill(0);
  for (let i = 1; i <= n; i++) ones[i] = ones[i >> 1] + (i & 1);
  return ones;
}
