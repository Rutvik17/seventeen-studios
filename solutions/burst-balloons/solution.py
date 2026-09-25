class Solution:
    def maxCoins(self, nums: List[int]) -> int:
        v = [1] + nums + [1]  # the imaginary 1s at both ends
        n = len(v)
        # best[l][r]: the most coins from bursting every balloon strictly between l and r.
        # Choose k, the LAST of them to burst: at that moment its neighbours are l and r.
        best = [[0] * n for _ in range(n)]
        for gap in range(2, n):  # shorter ranges first
            for l in range(0, n - gap):
                r = l + gap
                best[l][r] = max(best[l][k] + v[l] * v[k] * v[r] + best[k][r] for k in range(l + 1, r))
        return best[0][n - 1]
