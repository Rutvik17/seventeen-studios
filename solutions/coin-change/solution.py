class Solution:
    def coinChange(self, coins: List[int], amount: int) -> int:
        # fewest[x]: the fewest coins making x. The last coin is some c, so
        # fewest[x] = 1 + min(fewest[x - c]) over every coin c <= x.
        INF = amount + 1  # more coins than could ever be needed
        fewest = [0] + [INF] * amount
        for x in range(1, amount + 1):
            for c in coins:
                if c <= x and fewest[x - c] + 1 < fewest[x]:
                    fewest[x] = fewest[x - c] + 1
        return -1 if fewest[amount] == INF else fewest[amount]
