impl Solution {
    pub fn min_distance(word1: String, word2: String) -> i32 {
        // d(i, j): edits turning word1[..i] into word2[..j]. If the last letters match, d(i-1, j-1);
        // otherwise 1 + the cheapest of delete d(i-1, j), insert d(i, j-1), replace d(i-1, j-1).
        let (a, b) = (word1.as_bytes(), word2.as_bytes());
        let mut row: Vec<i32> = (0..=b.len() as i32).collect(); // from the empty word: j inserts
        for i in 1..=a.len() {
            let mut diag = row[0];
            row[0] = i as i32; // into the empty word: i deletes
            for j in 1..=b.len() {
                let above = row[j];
                row[j] = if a[i - 1] == b[j - 1] { diag } else { 1 + above.min(row[j - 1]).min(diag) };
                diag = above;
            }
        }
        row[b.len()]
    }
}
