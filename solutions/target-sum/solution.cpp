class Solution {
public:
    int findTargetSumWays(vector<int>& nums, int target) {
        // Split the numbers into those given + (summing to P) and those given - (summing to N):
        // P - N = target and P + N = total, so P = (total + target) / 2. Count subsets summing to P.
        int total = accumulate(nums.begin(), nums.end(), 0);
        if (abs(target) > total || (total + target) % 2) return 0;
        int goal = (total + target) / 2;
        vector<int> ways(goal + 1, 0); // ways[s]: subsets of the numbers so far that sum to s
        ways[0] = 1;
        for (int x : nums)
            for (int s = goal; s >= x; s--) ways[s] += ways[s - x]; // downwards, so x is used at most once
        return ways[goal];
    }
};
