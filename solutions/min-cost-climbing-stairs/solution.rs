impl Solution {
    pub fn min_cost_climbing_stairs(cost: Vec<i32>) -> i32 {
        // reach(i): cheapest way to stand on step i (the top is step n). Steps 0 and 1 are free.
        // reach(i) = min(reach(i - 1) + cost[i - 1], reach(i - 2) + cost[i - 2])
        let (mut a, mut b) = (0, 0); // reach(i - 2), reach(i - 1)
        for i in 2..=cost.len() {
            (a, b) = (b, (b + cost[i - 1]).min(a + cost[i - 2]));
        }
        b
    }
}
