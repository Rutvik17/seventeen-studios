class Solution {
    public boolean isMatch(String s, String p) {
        int m = s.length(), n = p.length();
        // match[i][j]: does s[i..] match p[j..]? Filled from the ends back to the start.
        boolean[][] match = new boolean[m + 1][n + 1];
        match[m][n] = true; // nothing matches nothing
        for (int i = m; i >= 0; i--)
            for (int j = n - 1; j >= 0; j--) {
                boolean first = i < m && (p.charAt(j) == s.charAt(i) || p.charAt(j) == '.'); // does s[i] match the pattern's next letter?
                if (j + 1 < n && p.charAt(j + 1) == '*')
                    match[i][j] = match[i][j + 2] || (first && match[i + 1][j]); // "x*": zero times, or one letter and stay
                else match[i][j] = first && match[i + 1][j + 1];
            }
        return match[0][0];
    }
}
