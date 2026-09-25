impl Solution {
    pub fn can_partition(nums: Vec<i32>) -> bool {
        let total: i32 = nums.iter().sum();
        if total % 2 != 0 {
            return false; // an odd total cannot split into two equal halves
        }
        let half = (total / 2) as usize;
        // can[s]: can some of the numbers seen so far add up to s?
        let mut can = vec![false; half + 1];
        can[0] = true;
        for &x in &nums {
            let x = x as usize;
            for s in (x..=half).rev() {
                // downwards, so x is used at most once
                can[s] = can[s] || can[s - x];
            }
            if can[half] {
                return true;
            }
        }
        can[half]
    }
}
