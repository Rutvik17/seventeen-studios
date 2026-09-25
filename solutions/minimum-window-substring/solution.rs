impl Solution {
    pub fn min_window(s: String, t: String) -> String {
        let b = s.as_bytes();
        let mut need = [0i32; 128]; // how many more of each character the window needs
        for c in t.bytes() {
            need[c as usize] += 1;
        }
        let mut missing = t.len();
        let (mut start, mut len) = (0, usize::MAX);
        let mut l = 0;
        for r in 0..b.len() {
            if need[b[r] as usize] > 0 {
                missing -= 1;
            }
            need[b[r] as usize] -= 1;
            while missing == 0 {
                // The window covers t: record it, then shrink it from the left.
                if r - l + 1 < len {
                    start = l;
                    len = r - l + 1;
                }
                need[b[l] as usize] += 1;
                if need[b[l] as usize] > 0 {
                    missing += 1;
                }
                l += 1;
            }
        }
        if len == usize::MAX { String::new() } else { s[start..start + len].to_string() }
    }
}
