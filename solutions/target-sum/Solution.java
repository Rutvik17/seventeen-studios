class Solution {
    public int findTargetSumWays(int[] nums, int target) {
        // Split the numbers into those given + (summing to P) and those given - (summing to N):
        // P - N = target and P + N = total, so P = (total + target) / 2. Count subsets summing to P.
        int total = 0;
        for (int x : nums) total += x;
        if (Math.abs(target) > total || (total + target) % 2 != 0) return 0;
        int goal = (total + target) / 2;
        int[] ways = new int[goal + 1]; // ways[s]: subsets of the numbers so far that sum to s
        ways[0] = 1;
        for (int x : nums)
            for (int s = goal; s >= x; s--) ways[s] += ways[s - x]; // downwards, so x is used at most once
        return ways[goal];
    }
}
