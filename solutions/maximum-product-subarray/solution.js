/**
 * @param {number[]} nums
 * @return {number}
 */
function maxProduct(nums) {
  // Track the largest and the smallest product of a run ending here: a negative number
  // turns the smallest (most negative) into the largest.
  let hi = nums[0];
  let lo = nums[0];
  let best = nums[0];
  for (let i = 1; i < nums.length; i++) {
    const x = nums[i];
    [hi, lo] = [Math.max(x, hi * x, lo * x), Math.min(x, hi * x, lo * x)];
    best = Math.max(best, hi);
  }
  return best;
}
