public class Solution {
    private bool[] cols, down, up;
    private char[][] board;
    private readonly IList<IList<string>> out_ = new List<IList<string>>();

    public IList<IList<string>> SolveNQueens(int n) {
        // A queen attacks along its column and both diagonals. On one "\" diagonal r - c
        // is the same; on one "/" diagonal r + c is (shifted by n so it is never negative).
        cols = new bool[n];
        down = new bool[2 * n];
        up = new bool[2 * n];
        board = new char[n][];
        for (int r = 0; r < n; r++) board[r] = new string('.', n).ToCharArray();
        Place(0, n);
        return out_;
    }

    // Rows above r each hold one queen.
    private void Place(int r, int n) {
        if (r == n) {
            out_.Add(board.Select(row => new string(row)).ToList());
            return;
        }
        for (int c = 0; c < n; c++) {
            if (cols[c] || down[r - c + n] || up[r + c]) continue;
            cols[c] = down[r - c + n] = up[r + c] = true;
            board[r][c] = 'Q';
            Place(r + 1, n);
            board[r][c] = '.'; // take it back and try the next column
            cols[c] = down[r - c + n] = up[r + c] = false;
        }
    }
}
