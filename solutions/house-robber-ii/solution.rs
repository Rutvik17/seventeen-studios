impl Solution {
    pub fn rob(nums: Vec<i32>) -> i32 {
        // The first and last houses touch, so at most one of them is robbed: solve the street
        // without the last house and the street without the first, and take the better.
        fn line(houses: &[i32]) -> i32 {
            let (mut prev2, mut prev1) = (0, 0);
            for &x in houses {
                (prev2, prev1) = (prev1, prev1.max(prev2 + x));
            }
            prev1
        }
        let n = nums.len();
        if n == 1 {
            return nums[0];
        }
        line(&nums[..n - 1]).max(line(&nums[1..]))
    }
}
