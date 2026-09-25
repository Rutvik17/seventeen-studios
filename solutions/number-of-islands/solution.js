/**
 * @param {character[][]} grid
 * @return {number}
 */
function numIslands(grid) {
  const rows = grid.length;
  const cols = grid[0].length;
  let islands = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r][c] !== '1') continue;
      islands++; // new land: sink the whole island so it is counted once
      grid[r][c] = '0';
      const stack = [[r, c]];
      while (stack.length) {
        const [i, j] = stack.pop();
        for (const [x, y] of [[i + 1, j], [i - 1, j], [i, j + 1], [i, j - 1]]) {
          if (x >= 0 && x < rows && y >= 0 && y < cols && grid[x][y] === '1') {
            grid[x][y] = '0';
            stack.push([x, y]);
          }
        }
      }
    }
  }
  return islands;
}
