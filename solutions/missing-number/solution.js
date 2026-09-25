/**
 * @param {number[]} nums
 * @return {number}
 */
function missingNumber(nums) {
  // XOR every index 0..n and every value: each number present cancels with its index,
  // leaving only the one that is missing.
  let out = nums.length;
  nums.forEach((x, i) => (out ^= i ^ x));
  return out;
}
