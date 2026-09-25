class Solution {
    public List<Integer> spiralOrder(int[][] matrix) {
        List<Integer> out = new ArrayList<>();
        int top = 0, bottom = matrix.length - 1, left = 0, right = matrix[0].length - 1; // the ring still unread
        while (top <= bottom && left <= right) {
            for (int c = left; c <= right; c++) out.add(matrix[top][c]); // along the top
            for (int r = top + 1; r <= bottom; r++) out.add(matrix[r][right]); // down the right side
            if (top < bottom && left < right) { // a ring more than one row or column thick
                for (int c = right - 1; c >= left; c--) out.add(matrix[bottom][c]); // back along the bottom
                for (int r = bottom - 1; r > top; r--) out.add(matrix[r][left]); // up the left side
            }
            top++;
            bottom--;
            left++;
            right--;
        }
        return out;
    }
}
