/**
 * @param {number[]} nums
 * @param {number} target
 * @return {number}
 */
function findTargetSumWays(nums, target) {
  // Split the numbers into those given + (summing to P) and those given - (summing to N):
  // P - N = target and P + N = total, so P = (total + target) / 2. Count subsets summing to P.
  const total = nums.reduce((a, b) => a + b, 0);
  if (Math.abs(target) > total || (total + target) % 2) return 0;
  const goal = (total + target) / 2;
  const ways = new Array(goal + 1).fill(0); // ways[s]: subsets of the numbers so far that sum to s
  ways[0] = 1;
  for (const x of nums) for (let s = goal; s >= x; s--) ways[s] += ways[s - x]; // downwards, so x is used at most once
  return ways[goal];
}
