class Solution {
public:
    bool isInterleave(string s1, string s2, string s3) {
        if (s1.size() + s2.size() != s3.size()) return false;
        // ok[j] (in row i): can s1[0..i) and s2[0..j) interleave into s3[0..i + j)? The last
        // letter of s3[0..i + j) came from s1 or from s2.
        vector<bool> ok(s2.size() + 1, false);
        for (size_t i = 0; i <= s1.size(); i++) {
            for (size_t j = 0; j <= s2.size(); j++) {
                if (i == 0 && j == 0) {
                    ok[j] = true;
                    continue;
                }
                size_t k = i + j - 1;
                bool from1 = i > 0 && ok[j] && s1[i - 1] == s3[k]; // ok[j] still holds row i - 1
                bool from2 = j > 0 && ok[j - 1] && s2[j - 1] == s3[k];
                ok[j] = from1 || from2;
            }
        }
        return ok[s2.size()];
    }
};
