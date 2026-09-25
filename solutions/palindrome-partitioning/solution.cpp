class Solution {
    vector<vector<string>> out;
    vector<string> cur;

    // s[0..i) is already cut into palindromes.
    void cut(const string& s, const vector<vector<bool>>& pal, size_t i) {
        if (i == s.size()) {
            out.push_back(cur);
            return;
        }
        for (size_t j = i; j < s.size(); j++) {
            if (!pal[i][j]) continue;
            cur.push_back(s.substr(i, j - i + 1));
            cut(s, pal, j + 1);
            cur.pop_back();
        }
    }
public:
    vector<vector<string>> partition(string s) {
        int n = s.size();
        // pal[i][j]: is s[i..j] a palindrome? Its ends match and its inside is one.
        vector<vector<bool>> pal(n, vector<bool>(n, false));
        for (int i = n - 1; i >= 0; i--)
            for (int j = i; j < n; j++) pal[i][j] = s[i] == s[j] && (j - i < 2 || pal[i + 1][j - 1]);
        cut(s, pal, 0);
        return out;
    }
};
