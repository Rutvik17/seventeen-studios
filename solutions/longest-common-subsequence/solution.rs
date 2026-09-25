impl Solution {
    pub fn longest_common_subsequence(text1: String, text2: String) -> i32 {
        // lcs(i, j) for the first i letters of text1 and j of text2: if the last letters match,
        // 1 + lcs(i - 1, j - 1); otherwise drop one of them, max(lcs(i - 1, j), lcs(i, j - 1)).
        // One row at a time is enough.
        let b = text2.as_bytes();
        let mut row = vec![0; b.len() + 1];
        for a in text1.bytes() {
            let mut diag = 0; // lcs(i - 1, j - 1): the old row's value one to the left
            for j in 1..=b.len() {
                let above = row[j];
                row[j] = if a == b[j - 1] { diag + 1 } else { row[j].max(row[j - 1]) };
                diag = above;
            }
        }
        row[b.len()]
    }
}
