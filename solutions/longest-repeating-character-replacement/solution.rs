impl Solution {
    pub fn character_replacement(s: String, k: i32) -> i32 {
        let b = s.as_bytes();
        let mut count = [0i32; 26];
        let (mut l, mut most) = (0usize, 0); // most: the highest count of one letter reached
        for r in 0..b.len() {
            count[(b[r] - b'A') as usize] += 1;
            most = most.max(count[(b[r] - b'A') as usize]);
            // Letters to replace = window length - most common letter. Too many? Slide.
            if (r - l + 1) as i32 - most > k {
                count[(b[l] - b'A') as usize] -= 1;
                l += 1;
            }
        }
        (b.len() - l) as i32 // the window never shrinks, so its final size is the best
    }
}
