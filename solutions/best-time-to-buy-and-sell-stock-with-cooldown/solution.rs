impl Solution {
    pub fn max_profit(prices: Vec<i32>) -> i32 {
        // The best profit at the end of each day, in each of three states:
        //   hold: owning a share;  sold: sold one today (so tomorrow must rest);  rest: free to buy.
        let (mut hold, mut sold, mut rest) = (i32::MIN / 2, 0, 0); // "minus infinity", halved so adding a price cannot overflow
        for p in prices {
            (hold, sold, rest) = (hold.max(rest - p), hold + p, rest.max(sold));
        }
        sold.max(rest)
    }
}
