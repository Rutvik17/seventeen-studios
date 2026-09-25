impl Solution {
    pub fn check_valid_string(s: String) -> bool {
        // Track the range of possible counts of unclosed '(': each '*' may be '(', ')' or nothing.
        let (mut lo, mut hi) = (0i32, 0i32);
        for c in s.chars() {
            lo += if c == '(' { 1 } else { -1 };
            hi += if c == ')' { -1 } else { 1 };
            if hi < 0 {
                return false; // even reading every '*' as '(' leaves too many ')'
            }
            lo = lo.max(0); // a count below zero is not a real reading; drop it
        }
        lo == 0 // some reading closes everything
    }
}
