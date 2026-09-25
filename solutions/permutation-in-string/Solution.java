class Solution {
    public boolean checkInclusion(String s1, String s2) {
        int n = s1.length();
        if (n > s2.length()) return false;
        int[] need = new int[26]; // how many more of each letter the window still needs
        for (char c : s1.toCharArray()) need[c - 'a']++;
        int missing = n; // letters of s1 not yet matched by the window
        for (int r = 0; r < s2.length(); r++) {
            if (need[s2.charAt(r) - 'a']-- > 0) missing--;
            if (r >= n && ++need[s2.charAt(r - n) - 'a'] > 0) missing++; // drop the first letter
            if (missing == 0) return true;
        }
        return false;
    }
}
