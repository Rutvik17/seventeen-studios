class Solution {
public:
    bool isMatch(string s, string p) {
        int m = s.size(), n = p.size();
        // match[i][j]: does s[i..] match p[j..]? Filled from the ends back to the start.
        vector<vector<bool>> match(m + 1, vector<bool>(n + 1, false));
        match[m][n] = true; // nothing matches nothing
        for (int i = m; i >= 0; i--)
            for (int j = n - 1; j >= 0; j--) {
                bool first = i < m && (p[j] == s[i] || p[j] == '.'); // does s[i] match the pattern's next letter?
                if (j + 1 < n && p[j + 1] == '*')
                    match[i][j] = match[i][j + 2] || (first && match[i + 1][j]); // "x*": zero times, or one letter and stay
                else match[i][j] = first && match[i + 1][j + 1];
            }
        return match[0][0];
    }
};
