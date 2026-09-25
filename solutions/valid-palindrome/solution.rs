impl Solution {
    pub fn is_palindrome(s: String) -> bool {
        let b = s.as_bytes();
        if b.is_empty() {
            return true;
        }
        let (mut l, mut r) = (0, b.len() - 1);
        while l < r {
            if !b[l].is_ascii_alphanumeric() {
                l += 1;
            } else if !b[r].is_ascii_alphanumeric() {
                r -= 1;
            } else if b[l].to_ascii_lowercase() != b[r].to_ascii_lowercase() {
                return false;
            } else {
                l += 1;
                r -= 1;
            }
        }
        true
    }
}
