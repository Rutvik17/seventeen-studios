class Solution {
    private boolean[] cols, down, up;
    private char[][] board;
    private final List<List<String>> out = new ArrayList<>();

    public List<List<String>> solveNQueens(int n) {
        // A queen attacks along its column and both diagonals. On one "\" diagonal r - c
        // is the same; on one "/" diagonal r + c is (shifted by n so it is never negative).
        cols = new boolean[n];
        down = new boolean[2 * n];
        up = new boolean[2 * n];
        board = new char[n][n];
        for (char[] row : board) Arrays.fill(row, '.');
        place(0, n);
        return out;
    }

    // Rows above r each hold one queen.
    private void place(int r, int n) {
        if (r == n) {
            List<String> b = new ArrayList<>();
            for (char[] row : board) b.add(new String(row));
            out.add(b);
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
}
