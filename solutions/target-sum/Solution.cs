public class Solution {
    public int FindTargetSumWays(int[] nums, int target) {
        // Split the numbers into those given + (summing to P) and those given - (summing to N):
        // P - N = target and P + N = total, so P = (total + target) / 2. Count subsets summing to P.
        int total = nums.Sum();
        if (Math.Abs(target) > total || (total + target) % 2 != 0) return 0;
        int goal = (total + target) / 2;
        var ways = new int[goal + 1]; // ways[s]: subsets of the numbers so far that sum to s
        ways[0] = 1;
        foreach (int x in nums)
            for (int s = goal; s >= x; s--) ways[s] += ways[s - x]; // downwards, so x is used at most once
        return ways[goal];
    }
}
