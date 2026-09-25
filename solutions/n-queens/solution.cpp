class Solution {
    vector<bool> cols, down, up;
    vector<string> board;
    vector<vector<string>> out;

    // Rows above r each hold one queen.
    void place(int r, int n) {
        if (r == n) {
            out.push_back(board);
            return;
        }
        for (int c = 0; c < n; c++) {
            if (cols[c] || down[r - c + n] || up[r + c]) continue;
            cols[c] = down[r - c + n] = up[r + c] = true;
            board[r][c] = 'Q';
            place(r + 1, n);
            board[r][c] = '.'; // take it back and try the next column
            cols[c] = down[r - c + n] = up[r + c] = false;
        }
    }
public:
    vector<vector<string>> solveNQueens(int n) {
        // A queen attacks along its column and both diagonals. On one "\" diagonal r - c
        // is the same; on one "/" diagonal r + c is (shifted by n so it is never negative).
        cols.assign(n, false);
        down.assign(2 * n, false);
        up.assign(2 * n, false);
        board.assign(n, string(n, '.'));
        place(0, n);
        return out;
    }
};
