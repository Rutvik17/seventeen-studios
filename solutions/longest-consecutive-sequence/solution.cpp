class Solution {
public:
    int longestConsecutive(vector<int>& nums) {
        unordered_set<int> have(nums.begin(), nums.end());
        int best = 0;
        for (int x : have) {
            if (have.count(x - 1)) continue; // not the start of a run
            int length = 1;
            while (have.count(x + length)) length++;
            best = max(best, length);
        }
        return best;
    }
};
