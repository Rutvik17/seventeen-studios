/**
 * @param {number} amount
 * @param {number[]} coins
 * @return {number}
 */
function change(amount, coins) {
  // ways[x]: combinations making x from the coins taken so far. Taking coins one kind at a
  // time counts each combination once, in one order — 1 + 2 and 2 + 1 are not both counted.
  // Only the final answer is sure to fit in 32 bits, so add modulo 2^32 (| 0): additions
  // wrapped that way still give the right final value.
  const ways = new Array(amount + 1).fill(0);
  ways[0] = 1;
  for (const c of coins) for (let x = c; x <= amount; x++) ways[x] = (ways[x] + ways[x - c]) | 0;
  return ways[amount];
}
