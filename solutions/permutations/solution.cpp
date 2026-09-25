class Solution {
    vector<vector<int>> out;

    // Positions before k are fixed; choose what goes at k.
    void place(vector<int>& nums, size_t k) {
        if (k == nums.size()) {
            out.push_back(nums);
            return;
        }
        for (size_t i = k; i < nums.size(); i++) {
            swap(nums[k], nums[i]); // bring nums[i] to position k
            place(nums, k + 1);
            swap(nums[k], nums[i]); // and put it back
        }
    }
public:
    vector<vector<int>> permute(vector<int>& nums) {
        place(nums, 0);
        return out;
    }
};
