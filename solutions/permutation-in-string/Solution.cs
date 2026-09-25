public class Solution {
    public bool CheckInclusion(string s1, string s2) {
        int n = s1.Length;
        if (n > s2.Length) return false;
        var need = new int[26]; // how many more of each letter the window still needs
        foreach (char c in s1) need[c - 'a']++;
        int missing = n; // letters of s1 not yet matched by the window
        for (int r = 0; r < s2.Length; r++) {
            if (need[s2[r] - 'a']-- > 0) missing--;
            if (r >= n && ++need[s2[r - n] - 'a'] > 0) missing++; // drop the first letter
            if (missing == 0) return true;
        }
        return false;
    }
}
