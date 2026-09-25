impl Solution {
    pub fn longest_palindrome(s: String) -> String {
        // Manacher's algorithm. Put '#' between the letters so every palindrome has a middle:
        // "abba" becomes "#a#b#b#a#". p[i] is how far the palindrome centred at i reaches.
        let b = s.as_bytes();
        let n = 2 * b.len() + 1;
        let mut t = vec![b'#'; n];
        for (i, &c) in b.iter().enumerate() {
            t[2 * i + 1] = c;
        }
        let mut p = vec![0usize; n];
        let (mut center, mut right, mut best) = (0, 0, 0); // center, right: the palindrome reaching furthest right
        for i in 0..n {
            if i < right {
                p[i] = (right - i).min(p[2 * center - i]); // its mirror image already knows this much
            }
            while i > p[i] && i + p[i] + 1 < n && t[i - p[i] - 1] == t[i + p[i] + 1] {
                p[i] += 1;
            }
            if i + p[i] > right {
                center = i;
                right = i + p[i];
            }
            if p[i] > p[best] {
                best = i;
            }
        }
        let start = (best - p[best]) / 2; // back from '#' positions to positions in s
        s[start..start + p[best]].to_string()
    }
}
