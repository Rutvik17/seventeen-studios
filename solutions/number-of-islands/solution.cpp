class Solution {
public:
    int numIslands(vector<vector<char>>& grid) {
        int rows = grid.size(), cols = grid[0].size(), islands = 0;
        int moves[4][2] = {{1, 0}, {-1, 0}, {0, 1}, {0, -1}};
        for (int r = 0; r < rows; r++) {
            for (int c = 0; c < cols; c++) {
                if (grid[r][c] != '1') continue;
                islands++; // new land: sink the whole island so it is counted once
                grid[r][c] = '0';
                vector<pair<int, int>> stack{{r, c}};
                while (!stack.empty()) {
                    auto [i, j] = stack.back();
                    stack.pop_back();
                    for (auto& m : moves) {
                        int x = i + m[0], y = j + m[1];
                        if (x >= 0 && x < rows && y >= 0 && y < cols && grid[x][y] == '1') {
                            grid[x][y] = '0';
                            stack.push_back({x, y});
                        }
                    }
                }
            }
        }
        return islands;
    }
};
