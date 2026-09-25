class Solution {
    vector<vector<int>> out;
    vector<int> cur;

    void pick(const vector<int>& c, size_t start, int left) {
        if (left == 0) {
            out.push_back(cur);
            return;
        }
        for (size_t i = start; i < c.size() && c[i] <= left; i++) {
            if (i > start && c[i] == c[i - 1]) continue; // the same value in the same place would repeat a combination
            cur.push_back(c[i]);
            pick(c, i + 1, left - c[i]); // each candidate used at most once
            cur.pop_back();
        }
    }
public:
    vector<vector<int>> combinationSum2(vector<int>& candidates, int target) {
        sort(candidates.begin(), candidates.end()); // equal values side by side, and too big means every later one is too
        pick(candidates, 0, target);
        return out;
    }
};
