/**
 * @param {number[]} prices
 * @return {number}
 */
function maxProfit(prices) {
  // The best profit at the end of each day, in each of three states:
  //   hold: owning a share;  sold: sold one today (so tomorrow must rest);  rest: free to buy.
  let hold = -Infinity;
  let sold = 0;
  let rest = 0;
  for (const p of prices) [hold, sold, rest] = [Math.max(hold, rest - p), hold + p, Math.max(rest, sold)];
  return Math.max(sold, rest);
}
