class Solution {
public:
    int maxProduct(vector<int>& nums) {
        // Track the largest and the smallest product of a run ending here: a negative number
        // turns the smallest (most negative) into the largest.
        int hi = nums[0], lo = nums[0], best = nums[0];
        for (size_t i = 1; i < nums.size(); i++) {
            int x = nums[i];
            int h = max({x, hi * x, lo * x});
            lo = min({x, hi * x, lo * x});
            hi = h;
            best = max(best, hi);
        }
        return best;
    }
};
