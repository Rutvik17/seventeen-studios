class Solution {
public:
    int missingNumber(vector<int>& nums) {
        // XOR every index 0..n and every value: each number present cancels with its index,
        // leaving only the one that is missing.
        int out = nums.size();
        for (int i = 0; i < (int)nums.size(); i++) out ^= i ^ nums[i];
        return out;
    }
};
