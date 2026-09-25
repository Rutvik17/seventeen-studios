/**
 * @param {number[]} nums
 * @return {number}
 */
function rob(nums) {
  // The first and last houses touch, so at most one of them is robbed: solve the street
  // without the last house and the street without the first, and take the better.
  const line = (from, to) => {
    let prev2 = 0;
    let prev1 = 0;
    for (let i = from; i <= to; i++) [prev2, prev1] = [prev1, Math.max(prev1, prev2 + nums[i])];
    return prev1;
  };
  const n = nums.length;
  if (n === 1) return nums[0];
  return Math.max(line(0, n - 2), line(1, n - 1));
}
