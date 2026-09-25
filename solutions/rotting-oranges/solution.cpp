class Solution {
public:
    int orangesRotting(vector<vector<int>>& grid) {
        int rows = grid.size(), cols = grid[0].size(), fresh = 0, minutes = 0;
        queue<pair<int, int>> rotten;
        for (int r = 0; r < rows; r++)
            for (int c = 0; c < cols; c++) {
                if (grid[r][c] == 2) rotten.push({r, c});
                else if (grid[r][c] == 1) fresh++;
            }
        int moves[4][2] = {{1, 0}, {-1, 0}, {0, 1}, {0, -1}};
        // Breadth-first from every rotten orange at once: each round is one minute.
        while (!rotten.empty() && fresh > 0) {
            for (int n = rotten.size(); n > 0; n--) {
                auto [i, j] = rotten.front();
                rotten.pop();
                for (auto& m : moves) {
                    int x = i + m[0], y = j + m[1];
                    if (x >= 0 && x < rows && y >= 0 && y < cols && grid[x][y] == 1) {
                        grid[x][y] = 2;
                        fresh--;
                        rotten.push({x, y});
                    }
                }
            }
            minutes++;
        }
        return fresh > 0 ? -1 : minutes;
    }
};
