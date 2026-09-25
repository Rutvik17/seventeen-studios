public class Solution {
    public int LengthOfLongestSubstring(string s) {
        var last = new int[128]; // character -> 1 + index where it was last seen (0: never)
        int best = 0;
        for (int l = 0, r = 0; r < s.Length; r++) {
            char c = s[r];
            l = Math.Max(l, last[c]); // jump the window's start past the earlier copy
            last[c] = r + 1;
            best = Math.Max(best, r - l + 1);
        }
        return best;
    }
}
