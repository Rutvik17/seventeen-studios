class Solution {
    vector<vector<int>> out;
    vector<int> cur;

    // Decide about nums[i], then everything after it.
    void choose(const vector<int>& nums, size_t i) {
        if (i == nums.size()) {
            out.push_back(cur);
            return;
        }
        cur.push_back(nums[i]); // with nums[i]
        choose(nums, i + 1);
        cur.pop_back(); // undo, then without it
        choose(nums, i + 1);
    }
public:
    vector<vector<int>> subsets(vector<int>& nums) {
        choose(nums, 0);
        return out;
    }
};
