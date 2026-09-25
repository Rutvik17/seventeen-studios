public class Solution {
    public int MaxSubArray(int[] nums) {
        // Kadane: the best run ending here either extends the one ending just before,
        // or starts afresh — whichever is larger. A negative run so far only drags it down.
        int here = nums[0], best = nums[0];
        for (int i = 1; i < nums.Length; i++) {
            here = Math.Max(nums[i], here + nums[i]);
            best = Math.Max(best, here);
        }
        return best;
    }
}
