impl Solution {
    pub fn permute(mut nums: Vec<i32>) -> Vec<Vec<i32>> {
        // Positions before k are fixed; choose what goes at k.
        fn place(nums: &mut Vec<i32>, k: usize, out: &mut Vec<Vec<i32>>) {
            if k == nums.len() {
                out.push(nums.clone());
                return;
            }
            for i in k..nums.len() {
                nums.swap(k, i); // bring nums[i] to position k
                place(nums, k + 1, out);
                nums.swap(k, i); // and put it back
            }
        }
        let mut out = vec![];
        place(&mut nums, 0, &mut out);
        out
    }
}
