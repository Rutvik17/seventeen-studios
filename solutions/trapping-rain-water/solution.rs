impl Solution {
    pub fn trap(height: Vec<i32>) -> i32 {
        if height.is_empty() {
            return 0;
        }
        let (mut l, mut r) = (0, height.len() - 1);
        let (mut left_max, mut right_max, mut water) = (0, 0, 0);
        while l < r {
            // The lower side decides: its level is its own tallest wall so far,
            // because the other side is known to have a taller one.
            if height[l] < height[r] {
                left_max = left_max.max(height[l]);
                water += left_max - height[l];
                l += 1;
            } else {
                right_max = right_max.max(height[r]);
                water += right_max - height[r];
                r -= 1;
            }
        }
        water
    }
}
