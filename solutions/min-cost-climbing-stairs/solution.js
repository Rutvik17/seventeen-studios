/**
 * @param {number[]} cost
 * @return {number}
 */
function minCostClimbingStairs(cost) {
  // reach(i): cheapest way to stand on step i (the top is step n). Steps 0 and 1 are free.
  // reach(i) = min(reach(i - 1) + cost[i - 1], reach(i - 2) + cost[i - 2])
  let a = 0; // reach(i - 2)
  let b = 0; // reach(i - 1)
  for (let i = 2; i <= cost.length; i++) [a, b] = [b, Math.min(b + cost[i - 1], a + cost[i - 2])];
  return b;
}
