public class Solution {
    public bool CheckValidString(string s) {
        // Track the range of possible counts of unclosed '(': each '*' may be '(', ')' or nothing.
        int lo = 0, hi = 0;
        foreach (char c in s) {
            lo += c == '(' ? 1 : -1;
            hi += c == ')' ? -1 : 1;
            if (hi < 0) return false; // even reading every '*' as '(' leaves too many ')'
            lo = Math.Max(lo, 0); // a count below zero is not a real reading; drop it
        }
        return lo == 0; // some reading closes everything
    }
}
