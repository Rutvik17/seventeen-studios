use std::cmp::Ordering;

impl Solution {
    pub fn three_sum(mut nums: Vec<i32>) -> Vec<Vec<i32>> {
        nums.sort_unstable();
        let n = nums.len();
        let mut out = vec![];
        for i in 0..n.saturating_sub(2) {
            if nums[i] > 0 {
                break; // the smallest of the three is positive
            }
            if i > 0 && nums[i] == nums[i - 1] {
                continue; // same first number: same triplets
            }
            let (mut l, mut r) = (i + 1, n - 1);
            while l < r {
                match (nums[i] + nums[l] + nums[r]).cmp(&0) {
                    Ordering::Less => l += 1,
                    Ordering::Greater => r -= 1,
                    Ordering::Equal => {
                        out.push(vec![nums[i], nums[l], nums[r]]);
                        l += 1;
                        while l < r && nums[l] == nums[l - 1] {
                            l += 1; // skip repeats of the middle number
                        }
                    }
                }
            }
        }
        out
    }
}
