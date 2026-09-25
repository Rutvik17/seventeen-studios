/**
 * @param {number[]} nums
 * @return {number}
 */
function rob(nums) {
  // best(i): the most from houses 0..i. Either skip house i, or rob it and skip i - 1.
  // best(i) = max(best(i - 1), best(i - 2) + nums[i])
  let prev2 = 0;
  let prev1 = 0;
  for (const x of nums) [prev2, prev1] = [prev1, Math.max(prev1, prev2 + x)];
  return prev1;
}
