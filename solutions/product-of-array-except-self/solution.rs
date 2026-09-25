impl Solution {
    pub fn product_except_self(nums: Vec<i32>) -> Vec<i32> {
        let n = nums.len();
        let mut out = vec![1; n];
        let mut prefix = 1; // product of everything to the left of i
        for i in 0..n {
            out[i] = prefix;
            prefix *= nums[i];
        }
        let mut suffix = 1; // product of everything to the right of i
        for i in (0..n).rev() {
            out[i] *= suffix;
            suffix *= nums[i];
        }
        out
    }
}
