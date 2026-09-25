class Solution:
    def minCostClimbingStairs(self, cost: List[int]) -> int:
        # reach(i): cheapest way to stand on step i (the top is step n). Steps 0 and 1 are free.
        # reach(i) = min(reach(i - 1) + cost[i - 1], reach(i - 2) + cost[i - 2])
        a = b = 0  # reach(i - 2), reach(i - 1)
        for i in range(2, len(cost) + 1):
            a, b = b, min(b + cost[i - 1], a + cost[i - 2])
        return b
