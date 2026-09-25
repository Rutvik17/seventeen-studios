impl Solution {
    pub fn erase_overlap_intervals(mut intervals: Vec<Vec<i32>>) -> i32 {
        // Keep as many as possible: always keep the one that ends first — it leaves the most room.
        intervals.sort_unstable_by_key(|iv| iv[1]);
        let (mut kept, mut end) = (0, i64::MIN);
        for iv in &intervals {
            if iv[0] as i64 >= end {
                // fits after the last one kept (touching is fine)
                kept += 1;
                end = iv[1] as i64;
            }
        }
        intervals.len() as i32 - kept
    }
}
