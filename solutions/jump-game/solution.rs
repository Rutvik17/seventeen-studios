impl Solution {
    pub fn can_jump(nums: Vec<i32>) -> bool {
        let mut reach = 0; // the furthest index reachable so far
        for (i, &x) in nums.iter().enumerate() {
            if i > reach {
                return false; // a gap nothing can jump across
            }
            reach = reach.max(i + x as usize);
        }
        true
    }
}
