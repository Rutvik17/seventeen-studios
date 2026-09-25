class Solution {
    public int rob(int[] nums) {
        // The first and last houses touch, so at most one of them is robbed: solve the street
        // without the last house and the street without the first, and take the better.
        int n = nums.length;
        if (n == 1) return nums[0];
        return Math.max(line(nums, 0, n - 2), line(nums, 1, n - 1));
    }

    private int line(int[] nums, int from, int to) {
        int prev2 = 0, prev1 = 0;
        for (int i = from; i <= to; i++) {
            int cur = Math.max(prev1, prev2 + nums[i]);
            prev2 = prev1;
            prev1 = cur;
        }
        return prev1;
    }
}
