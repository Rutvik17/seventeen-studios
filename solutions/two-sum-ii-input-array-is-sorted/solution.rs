use std::cmp::Ordering;

impl Solution {
    pub fn two_sum(numbers: Vec<i32>, target: i32) -> Vec<i32> {
        let (mut l, mut r) = (0, numbers.len() - 1);
        while l < r {
            match (numbers[l] + numbers[r]).cmp(&target) {
                Ordering::Equal => return vec![l as i32 + 1, r as i32 + 1], // 1-indexed
                Ordering::Less => l += 1,    // need a bigger sum
                Ordering::Greater => r -= 1, // need a smaller sum
            }
        }
        vec![]
    }
}
