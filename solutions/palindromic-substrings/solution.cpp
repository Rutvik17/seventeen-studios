class Solution {
public:
    int countSubstrings(string s) {
        // Manacher's algorithm (see Longest Palindromic Substring): p[i] is the reach of the
        // longest palindrome centred at i in "#a#b#...#". Every shorter one with the same
        // centre is a palindrome too, and there are (p[i] + 1) / 2 of them in s.
        int n = 2 * s.size() + 1, center = 0, right = 0, count = 0;
        string t(n, '#');
        for (size_t i = 0; i < s.size(); i++) t[2 * i + 1] = s[i];
        vector<int> p(n, 0);
        for (int i = 0; i < n; i++) {
            if (i < right) p[i] = min(right - i, p[2 * center - i]);
            while (i - p[i] - 1 >= 0 && i + p[i] + 1 < n && t[i - p[i] - 1] == t[i + p[i] + 1]) p[i]++;
            if (i + p[i] > right) {
                center = i;
                right = i + p[i];
            }
            count += (p[i] + 1) / 2;
        }
        return count;
    }
};
