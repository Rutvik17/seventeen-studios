class Solution:
    def climbStairs(self, n: int) -> int:
        # ways(i) = ways(i - 1) + ways(i - 2): the last move was one step or two.
        a, b = 1, 1  # ways to reach step 0 and step 1
        for _ in range(n - 1):
            a, b = b, a + b
        return b
