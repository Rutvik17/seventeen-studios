public class Solution {
    private int[][] h;
    private int rows, cols;

    public IList<IList<int>> PacificAtlantic(int[][] heights) {
        h = heights;
        rows = heights.Length;
        cols = heights[0].Length;
        var pacific = new bool[rows, cols];
        var atlantic = new bool[rows, cols];
        // Walk uphill from each ocean's edge: every cell reached can drain down into that ocean.
        for (int r = 0; r < rows; r++) {
            Reach(r, 0, pacific);
            Reach(r, cols - 1, atlantic);
        }
        for (int c = 0; c < cols; c++) {
            Reach(0, c, pacific);
            Reach(rows - 1, c, atlantic);
        }
        var out_ = new List<IList<int>>();
        for (int r = 0; r < rows; r++)
            for (int c = 0; c < cols; c++)
                if (pacific[r, c] && atlantic[r, c]) out_.Add(new List<int> { r, c });
        return out_;
    }

    private void Reach(int r, int c, bool[,] seen) {
        if (seen[r, c]) return;
        seen[r, c] = true;
        var stack = new Stack<(int, int)>();
        stack.Push((r, c));
        int[][] moves = { new[] { 1, 0 }, new[] { -1, 0 }, new[] { 0, 1 }, new[] { 0, -1 } };
        while (stack.Count > 0) {
            var (i, j) = stack.Pop();
            foreach (var m in moves) {
                int x = i + m[0], y = j + m[1];
                if (x >= 0 && x < rows && y >= 0 && y < cols && !seen[x, y] && h[x][y] >= h[i][j]) {
                    seen[x, y] = true;
                    stack.Push((x, y));
                }
            }
        }
    }
}
