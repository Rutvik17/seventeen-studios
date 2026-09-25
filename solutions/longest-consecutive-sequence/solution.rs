use std::collections::HashSet;

impl Solution {
    pub fn longest_consecutive(nums: Vec<i32>) -> i32 {
        let have: HashSet<i32> = nums.into_iter().collect();
        let mut best = 0;
        for &x in &have {
            if have.contains(&(x - 1)) {
                continue; // not the start of a run
            }
            let mut length = 1;
            while have.contains(&(x + length)) {
                length += 1;
            }
            best = best.max(length);
        }
        best
    }
}
