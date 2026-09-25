public class Solution {
    public IList<int> SpiralOrder(int[][] matrix) {
        var out_ = new List<int>();
        int top = 0, bottom = matrix.Length - 1, left = 0, right = matrix[0].Length - 1; // the ring still unread
        while (top <= bottom && left <= right) {
            for (int c = left; c <= right; c++) out_.Add(matrix[top][c]); // along the top
            for (int r = top + 1; r <= bottom; r++) out_.Add(matrix[r][right]); // down the right side
            if (top < bottom && left < right) { // a ring more than one row or column thick
                for (int c = right - 1; c >= left; c--) out_.Add(matrix[bottom][c]); // back along the bottom
                for (int r = bottom - 1; r > top; r--) out_.Add(matrix[r][left]); // up the left side
            }
            (top, bottom, left, right) = (top + 1, bottom - 1, left + 1, right - 1);
        }
        return out_;
    }
}
