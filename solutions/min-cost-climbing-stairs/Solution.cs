public class Solution {
    public int MinCostClimbingStairs(int[] cost) {
        // reach(i): cheapest way to stand on step i (the top is step n). Steps 0 and 1 are free.
        // reach(i) = min(reach(i - 1) + cost[i - 1], reach(i - 2) + cost[i - 2])
        int a = 0, b = 0; // reach(i - 2), reach(i - 1)
        for (int i = 2; i <= cost.Length; i++) (a, b) = (b, Math.Min(b + cost[i - 1], a + cost[i - 2]));
        return b;
    }
}
