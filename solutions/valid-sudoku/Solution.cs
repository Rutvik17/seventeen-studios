public class Solution {
    public bool IsValidSudoku(char[][] board) {
        // One bitmask per row, column and box: bit d is set once digit d has been seen there.
        int[] rows = new int[9], cols = new int[9], boxes = new int[9];
        for (int r = 0; r < 9; r++) {
            for (int c = 0; c < 9; c++) {
                if (board[r][c] == '.') continue;
                int bit = 1 << (board[r][c] - '0');
                int b = (r / 3) * 3 + c / 3;
                if (((rows[r] | cols[c] | boxes[b]) & bit) != 0) return false;
                rows[r] |= bit;
                cols[c] |= bit;
                boxes[b] |= bit;
            }
        }
        return true;
    }
}
