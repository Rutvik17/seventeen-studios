class Solution {
    public List<List<String>> partition(String s) {
        int n = s.length();
        // pal[i][j]: is s[i..j] a palindrome? Its ends match and its inside is one.
        boolean[][] pal = new boolean[n][n];
        for (int i = n - 1; i >= 0; i--)
            for (int j = i; j < n; j++) pal[i][j] = s.charAt(i) == s.charAt(j) && (j - i < 2 || pal[i + 1][j - 1]);
        List<List<String>> out = new ArrayList<>();
        cut(s, pal, 0, new ArrayList<>(), out);
        return out;
    }

    // s[0..i) is already cut into palindromes.
    private void cut(String s, boolean[][] pal, int i, List<String> cur, List<List<String>> out) {
        if (i == s.length()) {
            out.add(new ArrayList<>(cur));
            return;
        }
        for (int j = i; j < s.length(); j++) {
            if (!pal[i][j]) continue;
            cur.add(s.substring(i, j + 1));
            cut(s, pal, j + 1, cur, out);
            cur.remove(cur.size() - 1);
        }
    }
}
