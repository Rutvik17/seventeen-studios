/**
 * @param {number[][]} grid
 * @return {number}
 */
function maxAreaOfIsland(grid) {
  const rows = grid.length;
  const cols = grid[0].length;
  let best = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r][c] !== 1) continue;
      grid[r][c] = 0; // sink each square as it is counted, so none is counted twice
      const stack = [[r, c]];
      let area = 0;
      while (stack.length) {
        const [i, j] = stack.pop();
        area++;
        for (const [x, y] of [[i + 1, j], [i - 1, j], [i, j + 1], [i, j - 1]]) {
          if (x >= 0 && x < rows && y >= 0 && y < cols && grid[x][y] === 1) {
            grid[x][y] = 0;
            stack.push([x, y]);
          }
        }
      }
      best = Math.max(best, area);
    }
  }
  return best;
}
