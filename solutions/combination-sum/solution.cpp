class Solution {
    vector<vector<int>> out;
    vector<int> cur;

    // Add candidates from index start on; left: what is still needed.
    void pick(const vector<int>& c, size_t start, int left) {
        if (left == 0) {
            out.push_back(cur);
            return;
        }
        for (size_t i = start; i < c.size() && c[i] <= left; i++) {
            cur.push_back(c[i]);
            pick(c, i, left - c[i]); // i, not i + 1: the same number may be used again
            cur.pop_back();
        }
    }
public:
    vector<vector<int>> combinationSum(vector<int>& candidates, int target) {
        sort(candidates.begin(), candidates.end()); // so a candidate too big means every later one is too
        pick(candidates, 0, target);
        return out;
    }
};
