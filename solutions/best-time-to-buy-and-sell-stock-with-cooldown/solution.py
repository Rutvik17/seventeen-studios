class Solution:
    def maxProfit(self, prices: List[int]) -> int:
        # The best profit at the end of each day, in each of three states:
        #   hold: owning a share;  sold: sold one today (so tomorrow must rest);  rest: free to buy.
        hold, sold, rest = float("-inf"), 0, 0
        for p in prices:
            hold, sold, rest = max(hold, rest - p), hold + p, max(rest, sold)
        return max(sold, rest)
