impl Solution {
    pub fn single_number(nums: Vec<i32>) -> i32 {
        // x ^ x = 0 and x ^ 0 = x, and ^ ignores order: every pair cancels, the loner is left.
        nums.into_iter().fold(0, |acc, x| acc ^ x)
    }
}
