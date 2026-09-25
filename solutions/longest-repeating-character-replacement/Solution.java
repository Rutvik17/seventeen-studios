class Solution {
    public int characterReplacement(String s, int k) {
        int[] count = new int[26];
        int l = 0, most = 0; // most: the highest count of one letter the window has reached
        for (int r = 0; r < s.length(); r++) {
            most = Math.max(most, ++count[s.charAt(r) - 'A']);
            // Letters to replace = window length - most common letter. Too many? Slide.
            if (r - l + 1 - most > k) count[s.charAt(l++) - 'A']--;
        }
        return s.length() - l; // the window never shrinks, so its final size is the best
    }
}
