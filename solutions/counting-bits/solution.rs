impl Solution {
    pub fn count_bits(n: i32) -> Vec<i32> {
        // i >> 1 is i without its last bit, and already counted; add that last bit back.
        let n = n as usize;
        let mut ones = vec![0; n + 1];
        for i in 1..=n {
            ones[i] = ones[i >> 1] + (i & 1) as i32;
        }
        ones
    }
}
