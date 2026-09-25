impl Solution {
    pub fn is_interleave(s1: String, s2: String, s3: String) -> bool {
        let (a, b, c) = (s1.as_bytes(), s2.as_bytes(), s3.as_bytes());
        if a.len() + b.len() != c.len() {
            return false;
        }
        // ok[j] (in row i): can s1[..i] and s2[..j] interleave into s3[..i + j]? The last
        // letter of s3[..i + j] came from s1 or from s2.
        let mut ok = vec![false; b.len() + 1];
        for i in 0..=a.len() {
            for j in 0..=b.len() {
                if i == 0 && j == 0 {
                    ok[j] = true;
                    continue;
                }
                let k = i + j - 1;
                let from1 = i > 0 && ok[j] && a[i - 1] == c[k]; // ok[j] still holds row i - 1
                let from2 = j > 0 && ok[j - 1] && b[j - 1] == c[k];
                ok[j] = from1 || from2;
            }
        }
        ok[b.len()]
    }
}
