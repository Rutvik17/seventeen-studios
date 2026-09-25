class Solution {
    public void solve(char[][] board) {
        int rows = board.length, cols = board[0].length;
        // An O region survives exactly when it touches the edge. Mark those as safe ('S')
        // by spreading from every O on the edge.
        Deque<int[]> stack = new ArrayDeque<>();
        for (int r = 0; r < rows; r++)
            for (int c = 0; c < cols; c++)
                if ((r == 0 || r == rows - 1 || c == 0 || c == cols - 1) && board[r][c] == 'O') {
                    board[r][c] = 'S';
                    stack.push(new int[] {r, c});
                }
        int[][] moves = {{1, 0}, {-1, 0}, {0, 1}, {0, -1}};
        while (!stack.isEmpty()) {
            int[] p = stack.pop();
            for (int[] m : moves) {
                int x = p[0] + m[0], y = p[1] + m[1];
                if (x >= 0 && x < rows && y >= 0 && y < cols && board[x][y] == 'O') {
                    board[x][y] = 'S';
                    stack.push(new int[] {x, y});
                }
            }
        }
        // Every O left is surrounded: capture it. Then the safe ones go back to O.
        for (int r = 0; r < rows; r++)
            for (int c = 0; c < cols; c++) board[r][c] = board[r][c] == 'S' ? 'O' : 'X';
    }
}
