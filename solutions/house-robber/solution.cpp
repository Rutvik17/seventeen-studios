class Solution {
public:
    int rob(vector<int>& nums) {
        // best(i): the most from houses 0..i. Either skip house i, or rob it and skip i - 1.
        // best(i) = max(best(i - 1), best(i - 2) + nums[i])
        int prev2 = 0, prev1 = 0;
        for (int x : nums) {
            int cur = max(prev1, prev2 + x);
            prev2 = prev1;
            prev1 = cur;
        }
        return prev1;
    }
};
