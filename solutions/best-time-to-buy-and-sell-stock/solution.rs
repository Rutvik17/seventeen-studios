impl Solution {
    pub fn max_profit(prices: Vec<i32>) -> i32 {
        let mut lowest = prices[0]; // the cheapest day to buy so far
        let mut best = 0;
        for p in prices {
            lowest = lowest.min(p);
            best = best.max(p - lowest); // sell today, having bought at the lowest
        }
        best
    }
}
