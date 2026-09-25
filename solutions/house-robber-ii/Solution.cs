public class Solution {
    public int Rob(int[] nums) {
        // The first and last houses touch, so at most one of them is robbed: solve the street
        // without the last house and the street without the first, and take the better.
        int n = nums.Length;
        if (n == 1) return nums[0];
        return Math.Max(Line(nums, 0, n - 2), Line(nums, 1, n - 1));
    }

    private int Line(int[] nums, int from, int to) {
        int prev2 = 0, prev1 = 0;
        for (int i = from; i <= to; i++) (prev2, prev1) = (prev1, Math.Max(prev1, prev2 + nums[i]));
        return prev1;
    }
}
