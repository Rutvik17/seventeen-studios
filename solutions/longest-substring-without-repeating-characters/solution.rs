impl Solution {
    pub fn length_of_longest_substring(s: String) -> i32 {
        let mut last = [0usize; 128]; // character -> 1 + index where it was last seen (0: never)
        let (mut best, mut l) = (0, 0);
        for (r, c) in s.bytes().enumerate() {
            l = l.max(last[c as usize]); // jump the window's start past the earlier copy
            last[c as usize] = r + 1;
            best = best.max(r + 1 - l);
        }
        best as i32
    }
}
