impl Solution {
    pub fn count_substrings(s: String) -> i32 {
        // Manacher's algorithm (see Longest Palindromic Substring): p[i] is the reach of the
        // longest palindrome centred at i in "#a#b#...#". Every shorter one with the same
        // centre is a palindrome too, and there are (p[i] + 1) / 2 of them in s.
        let b = s.as_bytes();
        let n = 2 * b.len() + 1;
        let mut t = vec![b'#'; n];
        for (i, &c) in b.iter().enumerate() {
            t[2 * i + 1] = c;
        }
        let mut p = vec![0usize; n];
        let (mut center, mut right, mut count) = (0, 0, 0);
        for i in 0..n {
            if i < right {
                p[i] = (right - i).min(p[2 * center - i]);
            }
            while i > p[i] && i + p[i] + 1 < n && t[i - p[i] - 1] == t[i + p[i] + 1] {
                p[i] += 1;
            }
            if i + p[i] > right {
                center = i;
                right = i + p[i];
            }
            count += (p[i] + 1) / 2;
        }
        count as i32
    }
}
