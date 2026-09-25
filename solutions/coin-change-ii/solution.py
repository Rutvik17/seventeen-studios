class Solution:
    def change(self, amount: int, coins: List[int]) -> int:
        # ways[x]: combinations making x from the coins taken so far. Taking coins one kind at a
        # time counts each combination once, in one order — 1 + 2 and 2 + 1 are not both counted.
        ways = [1] + [0] * amount
        for c in coins:
            for x in range(c, amount + 1):
                ways[x] += ways[x - c]  # combinations for x that use at least one more c
        return ways[amount]
