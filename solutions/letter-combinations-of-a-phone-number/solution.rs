impl Solution {
    pub fn letter_combinations(digits: String) -> Vec<String> {
        const KEYS: [&str; 10] = ["", "", "abc", "def", "ghi", "jkl", "mno", "pqrs", "tuv", "wxyz"];
        // Letters for digits[..i] are chosen.
        fn spell(d: &[u8], i: usize, cur: &mut String, out: &mut Vec<String>) {
            if i == d.len() {
                out.push(cur.clone());
                return;
            }
            for letter in KEYS[(d[i] - b'0') as usize].chars() {
                cur.push(letter);
                spell(d, i + 1, cur, out);
                cur.pop();
            }
        }
        let mut out = vec![];
        if !digits.is_empty() {
            spell(digits.as_bytes(), 0, &mut String::new(), &mut out);
        }
        out
    }
}
