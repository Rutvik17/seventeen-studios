impl Solution {
    pub fn is_valid_sudoku(board: Vec<Vec<char>>) -> bool {
        // One bitmask per row, column and box: bit d is set once digit d has been seen there.
        let (mut rows, mut cols, mut boxes) = ([0u16; 9], [0u16; 9], [0u16; 9]);
        for r in 0..9 {
            for c in 0..9 {
                let ch = board[r][c];
                if ch == '.' {
                    continue;
                }
                let bit = 1u16 << (ch as u8 - b'0');
                let b = (r / 3) * 3 + c / 3;
                if (rows[r] | cols[c] | boxes[b]) & bit != 0 {
                    return false;
                }
                rows[r] |= bit;
                cols[c] |= bit;
                boxes[b] |= bit;
            }
        }
        true
    }
}
