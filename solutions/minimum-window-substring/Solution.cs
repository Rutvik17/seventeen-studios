public class Solution {
    public string MinWindow(string s, string t) {
        var need = new int[128]; // how many more of each character the window needs
        foreach (char c in t) need[c]++;
        int missing = t.Length, start = 0, len = int.MaxValue;
        for (int l = 0, r = 0; r < s.Length; r++) {
            if (need[s[r]]-- > 0) missing--;
            while (missing == 0) {
                // The window covers t: record it, then shrink it from the left.
                if (r - l + 1 < len) { start = l; len = r - l + 1; }
                if (++need[s[l++]] > 0) missing++;
            }
        }
        return len == int.MaxValue ? "" : s.Substring(start, len);
    }
}
