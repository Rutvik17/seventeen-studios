class Solution {
    public boolean searchMatrix(int[][] matrix, int target) {
        int cols = matrix[0].length;
        int lo = 0, hi = matrix.length * cols - 1; // read row by row, it is one sorted list
        while (lo <= hi) {
            int mid = lo + (hi - lo) / 2;
            int v = matrix[mid / cols][mid % cols]; // position k is row k / cols, column k % cols
            if (v == target) return true;
            if (v < target) lo = mid + 1;
            else hi = mid - 1;
        }
        return false;
    }
}
