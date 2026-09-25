class Solution {
public:
    string minWindow(string s, string t) {
        vector<int> need(128, 0); // how many more of each character the window needs
        for (char c : t) need[c]++;
        int missing = t.size(), start = 0, len = INT_MAX;
        for (int l = 0, r = 0; r < (int)s.size(); r++) {
            if (need[s[r]]-- > 0) missing--;
            while (missing == 0) {
                // The window covers t: record it, then shrink it from the left.
                if (r - l + 1 < len) { start = l; len = r - l + 1; }
                if (++need[s[l++]] > 0) missing++;
            }
        }
        return len == INT_MAX ? "" : s.substr(start, len);
    }
};
