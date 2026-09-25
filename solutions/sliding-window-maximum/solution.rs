use std::collections::VecDeque;

impl Solution {
    pub fn max_sliding_window(nums: Vec<i32>, k: i32) -> Vec<i32> {
        let k = k as usize;
        let mut dq: VecDeque<usize> = VecDeque::new(); // indices whose values decrease front to back
        let mut out = Vec::with_capacity(nums.len() + 1 - k);
        for i in 0..nums.len() {
            while dq.back().map_or(false, |&j| nums[j] <= nums[i]) {
                dq.pop_back(); // smaller values can never be a window's maximum again
            }
            dq.push_back(i);
            if dq[0] + k <= i {
                dq.pop_front(); // the front has slid out of the window
            }
            if i + 1 >= k {
                out.push(nums[dq[0]]); // the front is the window's maximum
            }
        }
        out
    }
}
