class Solution {
public:
    bool canPartition(vector<int>& nums) {
        int total = accumulate(nums.begin(), nums.end(), 0);
        if (total % 2) return false; // an odd total cannot split into two equal halves
        int half = total / 2;
        // can[s]: can some of the numbers seen so far add up to s?
        vector<bool> can(half + 1, false);
        can[0] = true;
        for (int x : nums) {
            for (int s = half; s >= x; s--) can[s] = can[s] || can[s - x]; // downwards, so x is used at most once
            if (can[half]) return true;
        }
        return can[half];
    }
};
