public class Solution {
    public void Rotate(int[][] matrix) {
        int n = matrix.Length;
        // A quarter turn clockwise is a flip across the main diagonal, then each row reversed.
        for (int i = 0; i < n; i++)
            for (int j = i + 1; j < n; j++) (matrix[i][j], matrix[j][i]) = (matrix[j][i], matrix[i][j]);
        foreach (var row in matrix) Array.Reverse(row);
    }
}
