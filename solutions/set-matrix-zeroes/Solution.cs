public class Solution {
    public void SetZeroes(int[][] matrix) {
        int rows = matrix.Length, cols = matrix[0].Length;
        // Use the first row and column as the notes of which columns and rows to clear.
        // Their own cells are needed for that, so remember separately whether they had a 0.
        bool firstRow = matrix[0].Contains(0), firstCol = matrix.Any(row => row[0] == 0);
        for (int r = 1; r < rows; r++)
            for (int c = 1; c < cols; c++)
                if (matrix[r][c] == 0) matrix[r][0] = matrix[0][c] = 0;
        for (int r = 1; r < rows; r++)
            for (int c = 1; c < cols; c++)
                if (matrix[r][0] == 0 || matrix[0][c] == 0) matrix[r][c] = 0;
        if (firstRow) Array.Fill(matrix[0], 0);
        if (firstCol) foreach (var row in matrix) row[0] = 0;
    }
}
