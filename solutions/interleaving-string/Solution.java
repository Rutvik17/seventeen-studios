class Solution {
    public boolean isInterleave(String s1, String s2, String s3) {
        if (s1.length() + s2.length() != s3.length()) return false;
        // ok[j] (in row i): can s1[0..i) and s2[0..j) interleave into s3[0..i + j)? The last
        // letter of s3[0..i + j) came from s1 or from s2.
        boolean[] ok = new boolean[s2.length() + 1];
        for (int i = 0; i <= s1.length(); i++) {
            for (int j = 0; j <= s2.length(); j++) {
                if (i == 0 && j == 0) {
                    ok[j] = true;
                    continue;
                }
                int k = i + j - 1;
                boolean from1 = i > 0 && ok[j] && s1.charAt(i - 1) == s3.charAt(k); // ok[j] still holds row i - 1
                boolean from2 = j > 0 && ok[j - 1] && s2.charAt(j - 1) == s3.charAt(k);
                ok[j] = from1 || from2;
            }
        }
        return ok[s2.length()];
    }
}
