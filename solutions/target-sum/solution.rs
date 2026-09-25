impl Solution {
    pub fn find_target_sum_ways(nums: Vec<i32>, target: i32) -> i32 {
        // Split the numbers into those given + (summing to P) and those given - (summing to N):
        // P - N = target and P + N = total, so P = (total + target) / 2. Count subsets summing to P.
        let total: i32 = nums.iter().sum();
        if target.abs() > total || (total + target) % 2 != 0 {
            return 0;
        }
        let goal = ((total + target) / 2) as usize;
        let mut ways = vec![0; goal + 1]; // ways[s]: subsets of the numbers so far that sum to s
        ways[0] = 1;
        for &x in &nums {
            let x = x as usize;
            for s in (x..=goal).rev() {
                ways[s] += ways[s - x]; // downwards, so x is used at most once
            }
        }
        ways[goal]
    }
}
