impl Solution {
    pub fn min_eating_speed(piles: Vec<i32>, h: i32) -> i32 {
        let hours = |k: i64| piles.iter().map(|&p| (p as i64 + k - 1) / k).sum::<i64>();
        let (mut lo, mut hi) = (1i64, *piles.iter().max().unwrap() as i64); // at hi every pile takes an hour
        while lo < hi {
            let mid = lo + (hi - lo) / 2;
            if hours(mid) <= h as i64 {
                hi = mid; // fast enough: maybe slower still works
            } else {
                lo = mid + 1; // too slow
            }
        }
        lo as i32
    }
}
