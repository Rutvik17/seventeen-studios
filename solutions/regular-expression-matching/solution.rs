impl Solution {
    pub fn is_match(s: String, p: String) -> bool {
        let (s, p) = (s.as_bytes(), p.as_bytes());
        let (m, n) = (s.len(), p.len());
        // matched[i][j]: does s[i..] match p[j..]? Filled from the ends back to the start.
        let mut matched = vec![vec![false; n + 1]; m + 1];
        matched[m][n] = true; // nothing matches nothing
        for i in (0..=m).rev() {
            for j in (0..n).rev() {
                let first = i < m && (p[j] == s[i] || p[j] == b'.'); // does s[i] match the pattern's next letter?
                matched[i][j] = if j + 1 < n && p[j + 1] == b'*' {
                    matched[i][j + 2] || (first && matched[i + 1][j]) // "x*": zero times, or one letter and stay
                } else {
                    first && matched[i + 1][j + 1]
                };
            }
        }
        matched[0][0]
    }
}
