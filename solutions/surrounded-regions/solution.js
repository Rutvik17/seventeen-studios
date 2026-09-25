/**
 * @param {character[][]} board
 * @return {void} Do not return anything, modify board in-place instead.
 */
function solve(board) {
  const rows = board.length;
  const cols = board[0].length;
  // An O region survives exactly when it touches the edge. Mark those as safe ("S")
  // by spreading from every O on the edge.
  const stack = [];
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++)
      if ((r === 0 || r === rows - 1 || c === 0 || c === cols - 1) && board[r][c] === 'O') {
        board[r][c] = 'S';
        stack.push([r, c]);
      }
  while (stack.length) {
    const [i, j] = stack.pop();
    for (const [x, y] of [[i + 1, j], [i - 1, j], [i, j + 1], [i, j - 1]]) {
      if (x >= 0 && x < rows && y >= 0 && y < cols && board[x][y] === 'O') {
        board[x][y] = 'S';
        stack.push([x, y]);
      }
    }
  }
  // Every O left is surrounded: capture it. Then the safe ones go back to O.
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) board[r][c] = board[r][c] === 'S' ? 'O' : 'X';
}
