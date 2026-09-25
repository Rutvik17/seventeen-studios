/**
 * @param {number[]} nums
 * @return {number}
 */
function singleNumber(nums) {
  // x ^ x = 0 and x ^ 0 = x, and ^ ignores order: every pair cancels, the loner is left.
  let out = 0;
  for (const x of nums) out ^= x;
  return out;
}
