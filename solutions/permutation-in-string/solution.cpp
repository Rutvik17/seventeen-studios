class Solution {
public:
    bool checkInclusion(string s1, string s2) {
        int n = s1.size();
        if (n > (int)s2.size()) return false;
        int need[26] = {0}; // how many more of each letter the window still needs
        for (char c : s1) need[c - 'a']++;
        int missing = n; // letters of s1 not yet matched by the window
        for (int r = 0; r < (int)s2.size(); r++) {
            if (need[s2[r] - 'a']-- > 0) missing--;
            if (r >= n && ++need[s2[r - n] - 'a'] > 0) missing++; // drop the first letter
            if (missing == 0) return true;
        }
        return false;
    }
};
