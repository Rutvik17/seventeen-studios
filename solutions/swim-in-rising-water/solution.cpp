class Solution {
public:
    int swimInWater(vector<vector<int>>& grid) {
        int n = grid.size();
        // Like Dijkstra, but a route's cost is its highest cell, not its sum: always extend
        // the route whose highest cell is lowest.
        priority_queue<tuple<int, int, int>, vector<tuple<int, int, int>>, greater<>> heap;
        heap.push({grid[0][0], 0, 0});
        vector<vector<bool>> seen(n, vector<bool>(n, false));
        seen[0][0] = true;
        int moves[4][2] = {{1, 0}, {-1, 0}, {0, 1}, {0, -1}};
        while (!heap.empty()) {
            auto [t, r, c] = heap.top();
            heap.pop();
            if (r == n - 1 && c == n - 1) return t;
            for (auto& m : moves) {
                int x = r + m[0], y = c + m[1];
                if (x >= 0 && x < n && y >= 0 && y < n && !seen[x][y]) {
                    seen[x][y] = true;
                    heap.push({max(t, grid[x][y]), x, y});
                }
            }
        }
        return -1;
    }
};
