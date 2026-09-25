impl Solution {
    pub fn reverse_bits(mut x: u32) -> u32 {
        let mut out = 0u32;
        for _ in 0..32 {
            out = (out << 1) | (x & 1); // take x's lowest bit onto out's low end
            x >>= 1;
        }
        out
    }
}
