class Solution {
public:
    int maxSubArray(vector<int>& nums) {
        // Kadane: the best run ending here either extends the one ending just before,
        // or starts afresh — whichever is larger. A negative run so far only drags it down.
        int here = nums[0], best = nums[0];
        for (size_t i = 1; i < nums.size(); i++) {
            here = max(nums[i], here + nums[i]);
            best = max(best, here);
        }
        return best;
    }
};
