public class Solution {
    public int NumIslands(char[][] grid) {
        int rows = grid.Length, cols = grid[0].Length, islands = 0;
        int[][] moves = { new[] { 1, 0 }, new[] { -1, 0 }, new[] { 0, 1 }, new[] { 0, -1 } };
        for (int r = 0; r < rows; r++) {
            for (int c = 0; c < cols; c++) {
                if (grid[r][c] != '1') continue;
                islands++; // new land: sink the whole island so it is counted once
                grid[r][c] = '0';
                var stack = new Stack<(int, int)>();
                stack.Push((r, c));
                while (stack.Count > 0) {
                    var (i, j) = stack.Pop();
                    foreach (var m in moves) {
                        int x = i + m[0], y = j + m[1];
                        if (x >= 0 && x < rows && y >= 0 && y < cols && grid[x][y] == '1') {
                            grid[x][y] = '0';
                            stack.Push((x, y));
                        }
                    }
                }
            }
        }
        return islands;
    }
}
