class Solution {
public:
    bool isValidSudoku(vector<vector<char>>& board) {
        // One bitmask per row, column and box: bit d is set once digit d has been seen there.
        int rows[9] = {0}, cols[9] = {0}, boxes[9] = {0};
        for (int r = 0; r < 9; r++) {
            for (int c = 0; c < 9; c++) {
                if (board[r][c] == '.') continue;
                int bit = 1 << (board[r][c] - '0');
                int b = (r / 3) * 3 + c / 3;
                if ((rows[r] | cols[c] | boxes[b]) & bit) return false;
                rows[r] |= bit;
                cols[c] |= bit;
                boxes[b] |= bit;
            }
        }
        return true;
    }
};
