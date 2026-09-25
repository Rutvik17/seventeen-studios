class Solution {
public:
    int maxCoins(vector<int>& nums) {
        vector<int> v{1}; // with imaginary 1s at both ends
        v.insert(v.end(), nums.begin(), nums.end());
        v.push_back(1);
        int n = v.size();
        // best[l][r]: the most coins from bursting every balloon strictly between l and r.
        // Choose k, the LAST of them to burst: at that moment its neighbours are l and r.
        vector<vector<int>> best(n, vector<int>(n, 0));
        for (int gap = 2; gap < n; gap++) // shorter ranges first
            for (int l = 0; l + gap < n; l++) {
                int r = l + gap;
                for (int k = l + 1; k < r; k++) best[l][r] = max(best[l][r], best[l][k] + v[l] * v[k] * v[r] + best[k][r]);
            }
        return best[0][n - 1];
    }
};
