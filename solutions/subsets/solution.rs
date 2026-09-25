impl Solution {
    pub fn subsets(nums: Vec<i32>) -> Vec<Vec<i32>> {
        // Decide about nums[i], then everything after it.
        fn choose(nums: &[i32], i: usize, cur: &mut Vec<i32>, out: &mut Vec<Vec<i32>>) {
            if i == nums.len() {
                out.push(cur.clone());
                return;
            }
            cur.push(nums[i]); // with nums[i]
            choose(nums, i + 1, cur, out);
            cur.pop(); // undo, then without it
            choose(nums, i + 1, cur, out);
        }
        let mut out = vec![];
        choose(&nums, 0, &mut vec![], &mut out);
        out
    }
}
