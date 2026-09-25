use std::collections::HashMap;

impl Solution {
    pub fn top_k_frequent(nums: Vec<i32>, k: i32) -> Vec<i32> {
        let mut count: HashMap<i32, usize> = HashMap::new();
        for &x in &nums {
            *count.entry(x).or_insert(0) += 1;
        }
        // buckets[f] holds every number that appears exactly f times.
        let mut buckets: Vec<Vec<i32>> = vec![vec![]; nums.len() + 1];
        for (x, f) in count {
            buckets[f].push(x);
        }
        let mut out = Vec::with_capacity(k as usize);
        for bucket in buckets.iter().rev() {
            for &x in bucket {
                if out.len() == k as usize {
                    return out;
                }
                out.push(x);
            }
        }
        out
    }
}
