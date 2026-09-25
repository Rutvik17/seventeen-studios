class Solution {
public:
    string alienOrder(vector<string>& words) {
        map<char, set<char>> after; // letter -> letters known to come after it
        map<char, int> need; // letter -> how many letters must come before it
        for (auto& w : words)
            for (char c : w) {
                after[c];
                need[c];
            }
        for (size_t i = 0; i + 1 < words.size(); i++) {
            const string &a = words[i], &b = words[i + 1];
            size_t k = 0;
            while (k < a.size() && k < b.size() && a[k] == b[k]) k++;
            if (k == a.size() || k == b.size()) {
                if (a.size() > b.size()) return ""; // "abc" before "ab" cannot be sorted in any alphabet
                continue;
            }
            // The first difference is the only thing this pair tells us.
            if (after[a[k]].insert(b[k]).second) need[b[k]]++;
        }
        // Kahn's algorithm, as in Course Schedule II.
        string order;
        for (auto& [c, n] : need) if (n == 0) order += c;
        for (size_t h = 0; h < order.size(); h++)
            for (char y : after[order[h]]) if (--need[y] == 0) order += y;
        return order.size() == need.size() ? order : ""; // short means a cycle
    }
};
