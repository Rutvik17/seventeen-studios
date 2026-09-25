impl Solution {
    pub fn can_complete_circuit(gas: Vec<i32>, cost: Vec<i32>) -> i32 {
        // If there is less gas than cost in total, no start works. Otherwise the answer is the
        // station after the last point where the running tank went negative: no start at or
        // before that point can get past it.
        let (mut total, mut tank, mut start) = (0, 0, 0);
        for i in 0..gas.len() {
            total += gas[i] - cost[i];
            tank += gas[i] - cost[i];
            if tank < 0 {
                start = i + 1;
                tank = 0;
            }
        }
        if total < 0 { -1 } else { start as i32 }
    }
}
