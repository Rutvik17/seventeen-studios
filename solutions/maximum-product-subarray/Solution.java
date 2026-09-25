class Solution {
    public int maxProduct(int[] nums) {
        // Track the largest and the smallest product of a run ending here: a negative number
        // turns the smallest (most negative) into the largest.
        int hi = nums[0], lo = nums[0], best = nums[0];
        for (int i = 1; i < nums.length; i++) {
            int x = nums[i];
            int h = Math.max(x, Math.max(hi * x, lo * x));
            lo = Math.min(x, Math.min(hi * x, lo * x));
            hi = h;
            best = Math.max(best, hi);
        }
        return best;
    }
}
