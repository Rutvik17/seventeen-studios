class Solution {
    vector<vector<int>> out;
    vector<int> cur;

    // cur is a subset; try adding each later value to it.
    void extend(const vector<int>& nums, size_t start) {
        out.push_back(cur);
        for (size_t i = start; i < nums.size(); i++) {
            if (i > start && nums[i] == nums[i - 1]) continue; // the same value in the same place would repeat a subset
            cur.push_back(nums[i]);
            extend(nums, i + 1);
            cur.pop_back();
        }
    }
public:
    vector<vector<int>> subsetsWithDup(vector<int>& nums) {
        sort(nums.begin(), nums.end()); // equal values side by side
        extend(nums, 0);
        return out;
    }
};
