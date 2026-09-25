impl Solution {
    pub fn rob(nums: Vec<i32>) -> i32 {
        // best(i): the most from houses 0..i. Either skip house i, or rob it and skip i - 1.
        // best(i) = max(best(i - 1), best(i - 2) + nums[i])
        let (mut prev2, mut prev1) = (0, 0);
        for x in nums {
            (prev2, prev1) = (prev1, prev1.max(prev2 + x));
        }
        prev1
    }
}
