impl Solution {
    pub fn missing_number(nums: Vec<i32>) -> i32 {
        // XOR every index 0..n and every value: each number present cancels with its index,
        // leaving only the one that is missing.
        nums.iter().enumerate().fold(nums.len() as i32, |acc, (i, &x)| acc ^ i as i32 ^ x)
    }
}
