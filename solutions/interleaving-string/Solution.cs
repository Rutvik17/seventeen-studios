public class Solution {
    public bool IsInterleave(string s1, string s2, string s3) {
        if (s1.Length + s2.Length != s3.Length) return false;
        // ok[j] (in row i): can s1[0..i) and s2[0..j) interleave into s3[0..i + j)? The last
        // letter of s3[0..i + j) came from s1 or from s2.
        var ok = new bool[s2.Length + 1];
        for (int i = 0; i <= s1.Length; i++) {
            for (int j = 0; j <= s2.Length; j++) {
                if (i == 0 && j == 0) {
                    ok[j] = true;
                    continue;
                }
                int k = i + j - 1;
                bool from1 = i > 0 && ok[j] && s1[i - 1] == s3[k]; // ok[j] still holds row i - 1
                bool from2 = j > 0 && ok[j - 1] && s2[j - 1] == s3[k];
                ok[j] = from1 || from2;
            }
        }
        return ok[s2.Length];
    }
}
