use std::cmp::Reverse;
use std::collections::BinaryHeap;

impl Solution {
    pub fn network_delay_time(times: Vec<Vec<i32>>, n: i32, k: i32) -> i32 {
        let n = n as usize;
        let mut out_of = vec![vec![]; n + 1];
        for t in &times {
            out_of[t[0] as usize].push((t[1] as usize, t[2]));
        }
        // Dijkstra: always settle the unsettled node the signal reaches soonest.
        let mut arrive = vec![-1; n + 1];
        let mut heap = BinaryHeap::from(vec![Reverse((0, k as usize))]);
        let (mut settled, mut last) = (0, 0);
        while let Some(Reverse((t, u))) = heap.pop() {
            if arrive[u] >= 0 {
                continue; // settled already, by a quicker route
            }
            arrive[u] = t;
            settled += 1;
            last = t;
            for &(v, w) in &out_of[u] {
                if arrive[v] < 0 {
                    heap.push(Reverse((t + w, v)));
                }
            }
        }
        if settled == n { last } else { -1 }
    }
}
