impl Solution {
    pub fn max_coins(nums: Vec<i32>) -> i32 {
        let mut v = vec![1]; // with imaginary 1s at both ends
        v.extend(nums);
        v.push(1);
        let n = v.len();
        // best[l][r]: the most coins from bursting every balloon strictly between l and r.
        // Choose k, the LAST of them to burst: at that moment its neighbours are l and r.
        let mut best = vec![vec![0; n]; n];
        for gap in 2..n {
            // shorter ranges first
            for l in 0..n - gap {
                let r = l + gap;
                for k in l + 1..r {
                    best[l][r] = best[l][r].max(best[l][k] + v[l] * v[k] * v[r] + best[k][r]);
                }
            }
        }
        best[0][n - 1]
    }
}
