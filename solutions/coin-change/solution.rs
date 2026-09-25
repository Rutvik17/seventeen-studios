impl Solution {
    pub fn coin_change(coins: Vec<i32>, amount: i32) -> i32 {
        // fewest[x]: the fewest coins making x. The last coin is some c, so
        // fewest[x] = 1 + min(fewest[x - c]) over every coin c <= x.
        let amount = amount as usize;
        let inf = amount as i32 + 1; // more coins than could ever be needed
        let mut fewest = vec![inf; amount + 1];
        fewest[0] = 0;
        for x in 1..=amount {
            for &c in &coins {
                let c = c as usize;
                if c <= x && fewest[x - c] + 1 < fewest[x] {
                    fewest[x] = fewest[x - c] + 1;
                }
            }
        }
        if fewest[amount] == inf { -1 } else { fewest[amount] }
    }
}
