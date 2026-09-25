/**
 * @param {number[]} nums
 * @param {number} k
 * @return {number[]}
 */
function maxSlidingWindow(nums, k) {
  const dq = new Array(nums.length); // indices whose values decrease front to back
  let head = 0;
  let tail = 0;
  const out = [];
  for (let i = 0; i < nums.length; i++) {
    while (tail > head && nums[dq[tail - 1]] <= nums[i]) tail--; // smaller values can never be a max again
    dq[tail++] = i;
    if (dq[head] <= i - k) head++; // the front has slid out of the window
    if (i >= k - 1) out.push(nums[dq[head]]); // the front is the window's maximum
  }
  return out;
}
