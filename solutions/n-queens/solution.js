/**
 * @param {number} n
 * @return {string[][]}
 */
function solveNQueens(n) {
  // A queen attacks along its column and both diagonals. On one "\" diagonal r - c
  // is the same; on one "/" diagonal r + c is (shifted by n so it is never negative).
  const cols = new Array(n).fill(false);
  const down = new Array(2 * n).fill(false);
  const up = new Array(2 * n).fill(false);
  const board = Array.from({ length: n }, () => new Array(n).fill('.'));
  const out = [];
  // Rows above r each hold one queen.
  const place = (r) => {
    if (r === n) return out.push(board.map((row) => row.join('')));
    for (let c = 0; c < n; c++) {
      if (cols[c] || down[r - c + n] || up[r + c]) continue;
      cols[c] = down[r - c + n] = up[r + c] = true;
      board[r][c] = 'Q';
      place(r + 1);
      board[r][c] = '.'; // take it back and try the next column
      cols[c] = down[r - c + n] = up[r + c] = false;
    }
  };
  place(0);
  return out;
}
