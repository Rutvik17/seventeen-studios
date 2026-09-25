class Solution {
    public int uniquePaths(int m, int n) {
        // Every path is m - 1 moves down and n - 1 moves right, in some order. Choosing which
        // of the m + n - 2 moves go down fixes the path: C(m + n - 2, k), k the smaller count.
        int k = Math.min(m, n) - 1, total = m + n - 2;
        long ways = 1;
        for (int i = 1; i <= k; i++) ways = ways * (total - k + i) / i; // exact at every step: it equals C(total - k + i, i)
        return (int) ways;
    }
}
