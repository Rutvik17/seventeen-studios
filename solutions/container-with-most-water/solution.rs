impl Solution {
    pub fn max_area(height: Vec<i32>) -> i32 {
        let (mut l, mut r) = (0, height.len() - 1);
        let mut best = 0;
        while l < r {
            best = best.max((r - l) as i32 * height[l].min(height[r]));
            // The shorter wall limits the water; moving the taller one in can only lose.
            if height[l] < height[r] {
                l += 1;
            } else {
                r -= 1;
            }
        }
        best
    }
}
