/**
 * @param {number[]} nums
 * @return {boolean}
 */
function canPartition(nums) {
  const total = nums.reduce((a, b) => a + b, 0);
  if (total % 2) return false; // an odd total cannot split into two equal halves
  const half = total / 2;
  // can[s]: can some of the numbers seen so far add up to s?
  const can = new Array(half + 1).fill(false);
  can[0] = true;
  for (const x of nums) {
    for (let s = half; s >= x; s--) can[s] = can[s] || can[s - x]; // downwards, so x is used at most once
    if (can[half]) return true;
  }
  return can[half];
}
