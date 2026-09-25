impl Solution {
    pub fn merge_triplets(triplets: Vec<Vec<i32>>, target: Vec<i32>) -> bool {
        // A triplet with any value above the target's can never be used: merging only raises.
        // Merge every other one; the target is reachable exactly when each position is hit.
        let mut got = [false; 3];
        for t in &triplets {
            if (0..3).any(|i| t[i] > target[i]) {
                continue;
            }
            for i in 0..3 {
                if t[i] == target[i] {
                    got[i] = true;
                }
            }
        }
        got.iter().all(|&g| g)
    }
}
