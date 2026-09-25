impl Solution {
    pub fn largest_rectangle_area(heights: Vec<i32>) -> i32 {
        let mut stack: Vec<(usize, i32)> = Vec::new(); // (start, height); heights increase upward
        let mut best = 0;
        let n = heights.len();
        for i in 0..=n {
            let h = if i == n { 0 } else { heights[i] }; // a final 0 flushes the stack
            let mut start = i;
            while let Some(&(j, hj)) = stack.last() {
                if hj < h {
                    break;
                }
                stack.pop();
                best = best.max(hj * (i - j) as i32); // hj could stretch from j up to i
                start = j; // the new bar can reach back as far
            }
            stack.push((start, h));
        }
        best
    }
}
