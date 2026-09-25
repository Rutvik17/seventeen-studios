/**
 * @param {number[]} coins
 * @param {number} amount
 * @return {number}
 */
function coinChange(coins, amount) {
  // fewest[x]: the fewest coins making x. The last coin is some c, so
  // fewest[x] = 1 + min(fewest[x - c]) over every coin c <= x.
  const INF = amount + 1; // more coins than could ever be needed
  const fewest = new Array(amount + 1).fill(INF);
  fewest[0] = 0;
  for (let x = 1; x <= amount; x++) for (const c of coins) if (c <= x && fewest[x - c] + 1 < fewest[x]) fewest[x] = fewest[x - c] + 1;
  return fewest[amount] === INF ? -1 : fewest[amount];
}
