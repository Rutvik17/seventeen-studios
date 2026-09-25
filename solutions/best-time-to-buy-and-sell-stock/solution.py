class Solution:
    def maxProfit(self, prices: List[int]) -> int:
        lowest = prices[0]  # the cheapest day to buy so far
        best = 0
        for p in prices:
            lowest = min(lowest, p)
            best = max(best, p - lowest)  # sell today, having bought at the lowest
        return best
