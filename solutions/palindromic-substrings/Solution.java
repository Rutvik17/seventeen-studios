class Solution {
    public int countSubstrings(String s) {
        // Manacher's algorithm (see Longest Palindromic Substring): p[i] is the reach of the
        // longest palindrome centred at i in "#a#b#...#". Every shorter one with the same
        // centre is a palindrome too, and there are (p[i] + 1) / 2 of them in s.
        int n = 2 * s.length() + 1, center = 0, right = 0, count = 0;
        char[] t = new char[n];
        for (int i = 0; i < n; i++) t[i] = i % 2 == 0 ? '#' : s.charAt(i / 2);
        int[] p = new int[n];
        for (int i = 0; i < n; i++) {
            if (i < right) p[i] = Math.min(right - i, p[2 * center - i]);
            while (i - p[i] - 1 >= 0 && i + p[i] + 1 < n && t[i - p[i] - 1] == t[i + p[i] + 1]) p[i]++;
            if (i + p[i] > right) {
                center = i;
                right = i + p[i];
            }
            count += (p[i] + 1) / 2;
        }
        return count;
    }
}
