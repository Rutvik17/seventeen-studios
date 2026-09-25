class Solution {
    public String longestPalindrome(String s) {
        // Manacher's algorithm. Put '#' between the letters so every palindrome has a middle:
        // "abba" becomes "#a#b#b#a#". p[i] is how far the palindrome centred at i reaches.
        int n = 2 * s.length() + 1;
        char[] t = new char[n];
        for (int i = 0; i < n; i++) t[i] = i % 2 == 0 ? '#' : s.charAt(i / 2);
        int[] p = new int[n];
        int center = 0, right = 0, best = 0; // center, right: the palindrome reaching furthest right
        for (int i = 0; i < n; i++) {
            if (i < right) p[i] = Math.min(right - i, p[2 * center - i]); // its mirror image already knows this much
            while (i - p[i] - 1 >= 0 && i + p[i] + 1 < n && t[i - p[i] - 1] == t[i + p[i] + 1]) p[i]++;
            if (i + p[i] > right) {
                center = i;
                right = i + p[i];
            }
            if (p[i] > p[best]) best = i;
        }
        int start = (best - p[best]) / 2; // back from '#' positions to positions in s
        return s.substring(start, start + p[best]);
    }
}
