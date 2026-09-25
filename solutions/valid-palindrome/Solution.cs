public class Solution {
    public bool IsPalindrome(string s) {
        int l = 0, r = s.Length - 1;
        while (l < r) {
            if (!char.IsLetterOrDigit(s[l])) l++;
            else if (!char.IsLetterOrDigit(s[r])) r--;
            else if (char.ToLower(s[l]) != char.ToLower(s[r])) return false;
            else { l++; r--; }
        }
        return true;
    }
}
