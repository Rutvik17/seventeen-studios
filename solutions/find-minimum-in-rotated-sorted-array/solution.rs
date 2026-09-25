impl Solution {
    pub fn find_min(nums: Vec<i32>) -> i32 {
        let (mut lo, mut hi) = (0, nums.len() - 1);
        while lo < hi {
            let mid = lo + (hi - lo) / 2;
            if nums[mid] > nums[hi] {
                lo = mid + 1; // the drop is to the right of mid
            } else {
                hi = mid; // mid..hi is sorted: the minimum is at mid or to its left
            }
        }
        nums[lo]
    }
}
