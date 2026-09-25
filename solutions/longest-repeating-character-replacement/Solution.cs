public class Solution {
    public int CharacterReplacement(string s, int k) {
        var count = new int[26];
        int l = 0, most = 0; // most: the highest count of one letter the window has reached
        for (int r = 0; r < s.Length; r++) {
            most = Math.Max(most, ++count[s[r] - 'A']);
            // Letters to replace = window length - most common letter. Too many? Slide.
            if (r - l + 1 - most > k) count[s[l++] - 'A']--;
        }
        return s.Length - l; // the window never shrinks, so its final size is the best
    }
}
