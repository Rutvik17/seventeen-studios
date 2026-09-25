/**
 * @param {number} n
 * @return {number}
 */
function climbStairs(n) {
  // ways(i) = ways(i - 1) + ways(i - 2): the last move was one step or two.
  let a = 1; // ways to reach step 0
  let b = 1; // ways to reach step 1
  for (let i = 1; i < n; i++) [a, b] = [b, a + b];
  return b;
}
