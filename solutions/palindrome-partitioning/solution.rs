impl Solution {
    pub fn partition(s: String) -> Vec<Vec<String>> {
        let b = s.as_bytes();
        let n = b.len();
        // pal[i][j]: is s[i..=j] a palindrome? Its ends match and its inside is one.
        let mut pal = vec![vec![false; n]; n];
        for i in (0..n).rev() {
            for j in i..n {
                pal[i][j] = b[i] == b[j] && (j - i < 2 || pal[i + 1][j - 1]);
            }
        }
        // s[..i] is already cut into palindromes.
        fn cut(s: &str, pal: &[Vec<bool>], i: usize, cur: &mut Vec<String>, out: &mut Vec<Vec<String>>) {
            if i == s.len() {
                out.push(cur.clone());
                return;
            }
            for j in i..s.len() {
                if pal[i][j] {
                    cur.push(s[i..=j].to_string());
                    cut(s, pal, j + 1, cur, out);
                    cur.pop();
                }
            }
        }
        let mut out = vec![];
        cut(&s, &pal, 0, &mut vec![], &mut out);
        out
    }
}
