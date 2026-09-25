/**
 * @param {number[]} prices
 * @return {number}
 */
function maxProfit(prices) {
  let lowest = prices[0]; // the cheapest day to buy so far
  let best = 0;
  for (const p of prices) {
    lowest = Math.min(lowest, p);
    best = Math.max(best, p - lowest); // sell today, having bought at the lowest
  }
  return best;
}
