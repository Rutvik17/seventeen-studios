impl Solution {
    pub fn subsets_with_dup(mut nums: Vec<i32>) -> Vec<Vec<i32>> {
        nums.sort(); // equal values side by side
        // cur is a subset; try adding each later value to it.
        fn extend(nums: &[i32], start: usize, cur: &mut Vec<i32>, out: &mut Vec<Vec<i32>>) {
            out.push(cur.clone());
            for i in start..nums.len() {
                if i > start && nums[i] == nums[i - 1] {
                    continue; // the same value in the same place would repeat a subset
                }
                cur.push(nums[i]);
                extend(nums, i + 1, cur, out);
                cur.pop();
            }
        }
        let mut out = vec![];
        extend(&nums, 0, &mut vec![], &mut out);
        out
    }
}
