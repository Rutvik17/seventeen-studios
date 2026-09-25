class Solution {
public:
    string longestPalindrome(string s) {
        // Manacher's algorithm. Put '#' between the letters so every palindrome has a middle:
        // "abba" becomes "#a#b#b#a#". p[i] is how far the palindrome centred at i reaches.
        int n = 2 * s.size() + 1;
        string t(n, '#');
        for (size_t i = 0; i < s.size(); i++) t[2 * i + 1] = s[i];
        vector<int> p(n, 0);
        int center = 0, right = 0, best = 0; // center, right: the palindrome reaching furthest right
        for (int i = 0; i < n; i++) {
            if (i < right) p[i] = min(right - i, p[2 * center - i]); // its mirror image already knows this much
            while (i - p[i] - 1 >= 0 && i + p[i] + 1 < n && t[i - p[i] - 1] == t[i + p[i] + 1]) p[i]++;
            if (i + p[i] > right) {
                center = i;
                right = i + p[i];
            }
            if (p[i] > p[best]) best = i;
        }
        return s.substr((best - p[best]) / 2, p[best]); // back from '#' positions to positions in s
    }
};
