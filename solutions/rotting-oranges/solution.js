/**
 * @param {number[][]} grid
 * @return {number}
 */
function orangesRotting(grid) {
  const rows = grid.length;
  const cols = grid[0].length;
  let rotten = [];
  let fresh = 0;
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) {
      if (grid[r][c] === 2) rotten.push([r, c]);
      else if (grid[r][c] === 1) fresh++;
    }
  let minutes = 0;
  // Breadth-first from every rotten orange at once: each round is one minute.
  while (rotten.length && fresh) {
    const next = [];
    for (const [i, j] of rotten) {
      for (const [x, y] of [[i + 1, j], [i - 1, j], [i, j + 1], [i, j - 1]]) {
        if (x >= 0 && x < rows && y >= 0 && y < cols && grid[x][y] === 1) {
          grid[x][y] = 2;
          fresh--;
          next.push([x, y]);
        }
      }
    }
    rotten = next;
    minutes++;
  }
  return fresh ? -1 : minutes;
}
