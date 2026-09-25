public class Solution {
    public int OrangesRotting(int[][] grid) {
        int rows = grid.Length, cols = grid[0].Length, fresh = 0, minutes = 0;
        var rotten = new Queue<(int, int)>();
        for (int r = 0; r < rows; r++)
            for (int c = 0; c < cols; c++) {
                if (grid[r][c] == 2) rotten.Enqueue((r, c));
                else if (grid[r][c] == 1) fresh++;
            }
        int[][] moves = { new[] { 1, 0 }, new[] { -1, 0 }, new[] { 0, 1 }, new[] { 0, -1 } };
        // Breadth-first from every rotten orange at once: each round is one minute.
        while (rotten.Count > 0 && fresh > 0) {
            for (int n = rotten.Count; n > 0; n--) {
                var (i, j) = rotten.Dequeue();
                foreach (var m in moves) {
                    int x = i + m[0], y = j + m[1];
                    if (x >= 0 && x < rows && y >= 0 && y < cols && grid[x][y] == 1) {
                        grid[x][y] = 2;
                        fresh--;
                        rotten.Enqueue((x, y));
                    }
                }
            }
            minutes++;
        }
        return fresh > 0 ? -1 : minutes;
    }
}
