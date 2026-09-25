impl Solution {
    pub fn search(nums: Vec<i32>, target: i32) -> i32 {
        let (mut lo, mut hi) = (0i32, nums.len() as i32 - 1);
        while lo <= hi {
            let mid = lo + (hi - lo) / 2;
            let (l, m, h) = (nums[lo as usize], nums[mid as usize], nums[hi as usize]);
            if m == target {
                return mid;
            }
            if l <= m {
                // the left half lo..mid is sorted
                if l <= target && target < m { hi = mid - 1 } else { lo = mid + 1 }
            } else {
                // the right half mid..hi is sorted
                if m < target && target <= h { lo = mid + 1 } else { hi = mid - 1 }
            }
        }
        -1
    }
}
