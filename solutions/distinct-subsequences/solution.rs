impl Solution {
    pub fn num_distinct(s: String, t: String) -> i32 {
        // ways[j]: ways to pick t[..j] from the part of s read so far. Each new letter of s can
        // either be skipped, or — if it equals t[j - 1] — end a copy of t[..j].
        // Only the final answer is sure to fit in 32 bits, so add with wrap-around modulo 2^32:
        // additions wrapped that way still give the right final value.
        let t = t.as_bytes();
        let mut ways = vec![0u32; t.len() + 1];
        ways[0] = 1; // the empty t is picked one way
        for ch in s.bytes() {
            for j in (1..=t.len()).rev() {
                // downwards, so this letter is used once
                if t[j - 1] == ch {
                    ways[j] = ways[j].wrapping_add(ways[j - 1]);
                }
            }
        }
        ways[t.len()] as i32
    }
}
