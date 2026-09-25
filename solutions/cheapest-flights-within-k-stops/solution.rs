impl Solution {
    pub fn find_cheapest_price(n: i32, flights: Vec<Vec<i32>>, src: i32, dst: i32, k: i32) -> i32 {
        // Bellman-Ford, stopped after k + 1 rounds: after round r, cost[v] is the cheapest
        // way to v using at most r flights (at most r - 1 stops).
        const INF: i32 = i32::MAX;
        let mut cost = vec![INF; n as usize];
        cost[src as usize] = 0;
        for _ in 0..=k {
            let before = cost.clone(); // read last round's costs, so one round adds only one flight
            for f in &flights {
                let (u, v, p) = (f[0] as usize, f[1] as usize, f[2]);
                if before[u] != INF && before[u] + p < cost[v] {
                    cost[v] = before[u] + p;
                }
            }
        }
        if cost[dst as usize] == INF { -1 } else { cost[dst as usize] }
    }
}
