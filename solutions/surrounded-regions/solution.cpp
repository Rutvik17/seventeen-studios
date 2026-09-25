class Solution {
public:
    void solve(vector<vector<char>>& board) {
        int rows = board.size(), cols = board[0].size();
        // An O region survives exactly when it touches the edge. Mark those as safe ('S')
        // by spreading from every O on the edge.
        vector<pair<int, int>> stack;
        for (int r = 0; r < rows; r++)
            for (int c = 0; c < cols; c++)
                if ((r == 0 || r == rows - 1 || c == 0 || c == cols - 1) && board[r][c] == 'O') {
                    board[r][c] = 'S';
                    stack.push_back({r, c});
                }
        int moves[4][2] = {{1, 0}, {-1, 0}, {0, 1}, {0, -1}};
        while (!stack.empty()) {
            auto [i, j] = stack.back();
            stack.pop_back();
            for (auto& m : moves) {
                int x = i + m[0], y = j + m[1];
                if (x >= 0 && x < rows && y >= 0 && y < cols && board[x][y] == 'O') {
                    board[x][y] = 'S';
                    stack.push_back({x, y});
                }
            }
        }
        // Every O left is surrounded: capture it. Then the safe ones go back to O.
        for (auto& row : board)
            for (char& ch : row) ch = ch == 'S' ? 'O' : 'X';
    }
};
