public class Solution {
    public void Solve(char[][] board) {
        int rows = board.Length, cols = board[0].Length;
        // An O region survives exactly when it touches the edge. Mark those as safe ('S')
        // by spreading from every O on the edge.
        var stack = new Stack<(int, int)>();
        for (int r = 0; r < rows; r++)
            for (int c = 0; c < cols; c++)
                if ((r == 0 || r == rows - 1 || c == 0 || c == cols - 1) && board[r][c] == 'O') {
                    board[r][c] = 'S';
                    stack.Push((r, c));
                }
        int[][] moves = { new[] { 1, 0 }, new[] { -1, 0 }, new[] { 0, 1 }, new[] { 0, -1 } };
        while (stack.Count > 0) {
            var (i, j) = stack.Pop();
            foreach (var m in moves) {
                int x = i + m[0], y = j + m[1];
                if (x >= 0 && x < rows && y >= 0 && y < cols && board[x][y] == 'O') {
                    board[x][y] = 'S';
                    stack.Push((x, y));
                }
            }
        }
        // Every O left is surrounded: capture it. Then the safe ones go back to O.
        for (int r = 0; r < rows; r++)
            for (int c = 0; c < cols; c++) board[r][c] = board[r][c] == 'S' ? 'O' : 'X';
    }
}
