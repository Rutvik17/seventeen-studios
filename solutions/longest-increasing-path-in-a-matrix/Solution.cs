public class Solution {
    public int LongestIncreasingPath(int[][] matrix) {
        int rows = matrix.Length, cols = matrix[0].Length;
        int[][] moves = { new[] { 1, 0 }, new[] { -1, 0 }, new[] { 0, 1 }, new[] { 0, -1 } };
        // Peel the matrix in layers, as in Kahn's algorithm: a cell's count is how many
        // neighbours are smaller. Cells with none start a path; removing a layer frees the next.
        var smaller = new int[rows, cols];
        var layer = new List<(int, int)>();
        for (int r = 0; r < rows; r++)
            for (int c = 0; c < cols; c++) {
                foreach (var m in moves) {
                    int x = r + m[0], y = c + m[1];
                    if (x >= 0 && x < rows && y >= 0 && y < cols && matrix[x][y] < matrix[r][c]) smaller[r, c]++;
                }
                if (smaller[r, c] == 0) layer.Add((r, c));
            }
        int length = 0;
        while (layer.Count > 0) {
            length++; // every cell in this layer ends a path of this many cells
            var next = new List<(int, int)>();
            foreach (var (r, c) in layer)
                foreach (var m in moves) {
                    int x = r + m[0], y = c + m[1];
                    if (x >= 0 && x < rows && y >= 0 && y < cols && matrix[x][y] > matrix[r][c] && --smaller[x, y] == 0) next.Add((x, y));
                }
            layer = next;
        }
        return length;
    }
}
