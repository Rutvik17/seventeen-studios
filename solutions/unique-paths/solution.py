class Solution:
    def uniquePaths(self, m: int, n: int) -> int:
        # Every path is m - 1 moves down and n - 1 moves right, in some order. Choosing which
        # of the m + n - 2 moves go down fixes the path: C(m + n - 2, k), k the smaller count.
        k = min(m, n) - 1
        total = m + n - 2
        ways = 1
        for i in range(1, k + 1):
            ways = ways * (total - k + i) // i  # exact at every step: it equals C(total - k + i, i)
        return ways
