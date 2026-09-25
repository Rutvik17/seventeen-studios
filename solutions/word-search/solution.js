/**
 * @param {character[][]} board
 * @param {string} word
 * @return {boolean}
 */
function exist(board, word) {
  const rows = board.length;
  const cols = board[0].length;
  // Quick refusal: the board must hold enough of every letter the word needs.
  const have = new Map();
  for (const row of board) for (const c of row) have.set(c, (have.get(c) ?? 0) + 1);
  for (const c of word) {
    if (!have.get(c)) return false;
    have.set(c, have.get(c) - 1);
  }
  // Can word[i..] be traced starting at (r, c)?
  const trace = (r, c, i) => {
    if (r < 0 || r >= rows || c < 0 || c >= cols || board[r][c] !== word[i]) return false;
    if (i === word.length - 1) return true;
    board[r][c] = '#'; // in use on this path
    const found = trace(r + 1, c, i + 1) || trace(r - 1, c, i + 1) || trace(r, c + 1, i + 1) || trace(r, c - 1, i + 1);
    board[r][c] = word[i]; // free it again
    return found;
  };
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) if (trace(r, c, 0)) return true;
  return false;
}
