class Solution {
public:
    int lengthOfLongestSubstring(string s) {
        vector<int> last(128, 0); // character -> 1 + index where it was last seen (0: never)
        int best = 0;
        for (int l = 0, r = 0; r < (int)s.size(); r++) {
            unsigned char c = s[r];
            l = max(l, last[c]); // jump the window's start past the earlier copy
            last[c] = r + 1;
            best = max(best, r - l + 1);
        }
        return best;
    }
};
