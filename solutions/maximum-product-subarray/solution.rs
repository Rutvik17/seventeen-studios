impl Solution {
    pub fn max_product(nums: Vec<i32>) -> i32 {
        // Track the largest and the smallest product of a run ending here: a negative number
        // turns the smallest (most negative) into the largest.
        let (mut hi, mut lo, mut best) = (nums[0], nums[0], nums[0]);
        for &x in &nums[1..] {
            (hi, lo) = (x.max(hi * x).max(lo * x), x.min(hi * x).min(lo * x));
            best = best.max(hi);
        }
        best
    }
}
