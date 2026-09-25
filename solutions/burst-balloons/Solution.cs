public class Solution {
    public int MaxCoins(int[] nums) {
        int n = nums.Length + 2;
        var v = new int[n]; // with imaginary 1s at both ends
        v[0] = v[n - 1] = 1;
        for (int i = 0; i < nums.Length; i++) v[i + 1] = nums[i];
        // best[l, r]: the most coins from bursting every balloon strictly between l and r.
        // Choose k, the LAST of them to burst: at that moment its neighbours are l and r.
        var best = new int[n, n];
        for (int gap = 2; gap < n; gap++) // shorter ranges first
            for (int l = 0; l + gap < n; l++) {
                int r = l + gap;
                for (int k = l + 1; k < r; k++) best[l, r] = Math.Max(best[l, r], best[l, k] + v[l] * v[k] * v[r] + best[k, r]);
            }
        return best[0, n - 1];
    }
}
