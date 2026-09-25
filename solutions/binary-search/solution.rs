use std::cmp::Ordering;

impl Solution {
    pub fn search(nums: Vec<i32>, target: i32) -> i32 {
        let (mut lo, mut hi) = (0usize, nums.len()); // search [lo, hi)
        while lo < hi {
            let mid = lo + (hi - lo) / 2;
            match nums[mid].cmp(&target) {
                Ordering::Equal => return mid as i32,
                Ordering::Less => lo = mid + 1, // the target can only be to the right
                Ordering::Greater => hi = mid,  // the target can only be to the left
            }
        }
        -1
    }
}
