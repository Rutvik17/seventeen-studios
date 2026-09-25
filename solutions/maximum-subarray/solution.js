/**
 * @param {number[]} nums
 * @return {number}
 */
function maxSubArray(nums) {
  // Kadane: the best run ending here either extends the one ending just before,
  // or starts afresh — whichever is larger. A negative run so far only drags it down.
  let here = nums[0];
  let best = nums[0];
  for (let i = 1; i < nums.length; i++) {
    here = Math.max(nums[i], here + nums[i]);
    best = Math.max(best, here);
  }
  return best;
}
