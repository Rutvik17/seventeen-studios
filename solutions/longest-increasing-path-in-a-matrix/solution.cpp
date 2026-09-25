class Solution {
public:
    int longestIncreasingPath(vector<vector<int>>& matrix) {
        int rows = matrix.size(), cols = matrix[0].size();
        int moves[4][2] = {{1, 0}, {-1, 0}, {0, 1}, {0, -1}};
        // Peel the matrix in layers, as in Kahn's algorithm: a cell's count is how many
        // neighbours are smaller. Cells with none start a path; removing a layer frees the next.
        vector<vector<int>> smaller(rows, vector<int>(cols, 0));
        vector<pair<int, int>> layer;
        for (int r = 0; r < rows; r++)
            for (int c = 0; c < cols; c++) {
                for (auto& m : moves) {
                    int x = r + m[0], y = c + m[1];
                    if (x >= 0 && x < rows && y >= 0 && y < cols && matrix[x][y] < matrix[r][c]) smaller[r][c]++;
                }
                if (smaller[r][c] == 0) layer.push_back({r, c});
            }
        int length = 0;
        while (!layer.empty()) {
            length++; // every cell in this layer ends a path of this many cells
            vector<pair<int, int>> next;
            for (auto [r, c] : layer)
                for (auto& m : moves) {
                    int x = r + m[0], y = c + m[1];
                    if (x >= 0 && x < rows && y >= 0 && y < cols && matrix[x][y] > matrix[r][c] && --smaller[x][y] == 0) next.push_back({x, y});
                }
            layer = move(next);
        }
        return length;
    }
};
