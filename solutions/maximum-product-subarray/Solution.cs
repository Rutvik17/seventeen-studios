public class Solution {
    public int MaxProduct(int[] nums) {
        // Track the largest and the smallest product of a run ending here: a negative number
        // turns the smallest (most negative) into the largest.
        int hi = nums[0], lo = nums[0], best = nums[0];
        for (int i = 1; i < nums.Length; i++) {
            int x = nums[i];
            (hi, lo) = (Math.Max(x, Math.Max(hi * x, lo * x)), Math.Min(x, Math.Min(hi * x, lo * x)));
            best = Math.Max(best, hi);
        }
        return best;
    }
}
