impl Solution {
    pub fn jump(nums: Vec<i32>) -> i32 {
        // Breadth-first in disguise: indices reachable in `jumps` jumps form a window ending
        // at `end`; scanning it finds how far one more jump can reach (`far`).
        let (mut jumps, mut end, mut far) = (0, 0, 0);
        for i in 0..nums.len().saturating_sub(1) {
            far = far.max(i + nums[i] as usize);
            if i == end {
                // the window is used up: jump once more
                jumps += 1;
                end = far;
            }
        }
        jumps
    }
}
