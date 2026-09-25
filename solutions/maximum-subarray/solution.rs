impl Solution {
    pub fn max_sub_array(nums: Vec<i32>) -> i32 {
        // Kadane: the best run ending here either extends the one ending just before,
        // or starts afresh — whichever is larger. A negative run so far only drags it down.
        let (mut here, mut best) = (nums[0], nums[0]);
        for &x in &nums[1..] {
            here = x.max(here + x);
            best = best.max(here);
        }
        best
    }
}
