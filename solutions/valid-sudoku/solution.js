/**
 * @param {character[][]} board
 * @return {boolean}
 */
function isValidSudoku(board) {
  // One bitmask per row, column and box: bit d is set once digit d has been seen there.
  const rows = new Array(9).fill(0);
  const cols = new Array(9).fill(0);
  const boxes = new Array(9).fill(0);
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (board[r][c] === '.') continue;
      const bit = 1 << Number(board[r][c]);
      const b = Math.floor(r / 3) * 3 + Math.floor(c / 3);
      if (rows[r] & bit || cols[c] & bit || boxes[b] & bit) return false;
      rows[r] |= bit;
      cols[c] |= bit;
      boxes[b] |= bit;
    }
  }
  return true;
}
