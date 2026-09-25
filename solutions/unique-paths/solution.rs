impl Solution {
    pub fn unique_paths(m: i32, n: i32) -> i32 {
        // Every path is m - 1 moves down and n - 1 moves right, in some order. Choosing which
        // of the m + n - 2 moves go down fixes the path: C(m + n - 2, k), k the smaller count.
        let (k, total) = ((m.min(n) - 1) as i64, (m + n - 2) as i64);
        let mut ways: i64 = 1;
        for i in 1..=k {
            ways = ways * (total - k + i) / i; // exact at every step: it equals C(total - k + i, i)
        }
        ways as i32
    }
}
