impl Solution {
    pub fn change(amount: i32, coins: Vec<i32>) -> i32 {
        // ways[x]: combinations making x from the coins taken so far. Taking coins one kind at a
        // time counts each combination once, in one order — 1 + 2 and 2 + 1 are not both counted.
        // Only the final answer is sure to fit in 32 bits, so add with wrap-around modulo 2^32:
        // additions wrapped that way still give the right final value.
        let amount = amount as usize;
        let mut ways = vec![0u32; amount + 1];
        ways[0] = 1;
        for &c in &coins {
            for x in c as usize..=amount {
                ways[x] = ways[x].wrapping_add(ways[x - c as usize]);
            }
        }
        ways[amount] as i32
    }
}
