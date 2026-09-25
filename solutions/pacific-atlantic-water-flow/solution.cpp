class Solution {
    int rows, cols;

    // Walk uphill from (r, c): every cell reached can drain down to it.
    void reach(const vector<vector<int>>& h, int r, int c, vector<vector<bool>>& seen) {
        if (seen[r][c]) return;
        seen[r][c] = true;
        vector<pair<int, int>> stack{{r, c}};
        int moves[4][2] = {{1, 0}, {-1, 0}, {0, 1}, {0, -1}};
        while (!stack.empty()) {
            auto [i, j] = stack.back();
            stack.pop_back();
            for (auto& m : moves) {
                int x = i + m[0], y = j + m[1];
                if (x >= 0 && x < rows && y >= 0 && y < cols && !seen[x][y] && h[x][y] >= h[i][j]) {
                    seen[x][y] = true;
                    stack.push_back({x, y});
                }
            }
        }
    }
public:
    vector<vector<int>> pacificAtlantic(vector<vector<int>>& heights) {
        rows = heights.size();
        cols = heights[0].size();
        vector<vector<bool>> pacific(rows, vector<bool>(cols)), atlantic(rows, vector<bool>(cols));
        // Walk uphill from each ocean's edge: every cell reached can drain down into that ocean.
        for (int r = 0; r < rows; r++) {
            reach(heights, r, 0, pacific);
            reach(heights, r, cols - 1, atlantic);
        }
        for (int c = 0; c < cols; c++) {
            reach(heights, 0, c, pacific);
            reach(heights, rows - 1, c, atlantic);
        }
        vector<vector<int>> out;
        for (int r = 0; r < rows; r++)
            for (int c = 0; c < cols; c++)
                if (pacific[r][c] && atlantic[r][c]) out.push_back({r, c});
        return out;
    }
};
