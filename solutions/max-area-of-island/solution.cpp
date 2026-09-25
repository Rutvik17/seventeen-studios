class Solution {
public:
    int maxAreaOfIsland(vector<vector<int>>& grid) {
        int rows = grid.size(), cols = grid[0].size(), best = 0;
        int moves[4][2] = {{1, 0}, {-1, 0}, {0, 1}, {0, -1}};
        for (int r = 0; r < rows; r++) {
            for (int c = 0; c < cols; c++) {
                if (grid[r][c] != 1) continue;
                grid[r][c] = 0; // sink each square as it is counted, so none is counted twice
                vector<pair<int, int>> stack{{r, c}};
                int area = 0;
                while (!stack.empty()) {
                    auto [i, j] = stack.back();
                    stack.pop_back();
                    area++;
                    for (auto& m : moves) {
                        int x = i + m[0], y = j + m[1];
                        if (x >= 0 && x < rows && y >= 0 && y < cols && grid[x][y] == 1) {
                            grid[x][y] = 0;
                            stack.push_back({x, y});
                        }
                    }
                }
                best = max(best, area);
            }
        }
        return best;
    }
};
