/**
 * @param {number[][]} matrix
 * @return {number}
 */
function longestIncreasingPath(matrix) {
  const rows = matrix.length;
  const cols = matrix[0].length;
  const moves = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  // Peel the matrix in layers, as in Kahn's algorithm: a cell's count is how many
  // neighbours are smaller. Cells with none start a path; removing a layer frees the next.
  const smaller = Array.from({ length: rows }, () => new Array(cols).fill(0));
  let layer = [];
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) {
      for (const [dr, dc] of moves) {
        const x = r + dr;
        const y = c + dc;
        if (x >= 0 && x < rows && y >= 0 && y < cols && matrix[x][y] < matrix[r][c]) smaller[r][c]++;
      }
      if (smaller[r][c] === 0) layer.push([r, c]);
    }
  let length = 0;
  while (layer.length) {
    length++; // every cell in this layer ends a path of this many cells
    const next = [];
    for (const [r, c] of layer)
      for (const [dr, dc] of moves) {
        const x = r + dr;
        const y = c + dc;
        if (x >= 0 && x < rows && y >= 0 && y < cols && matrix[x][y] > matrix[r][c] && --smaller[x][y] === 0) next.push([x, y]);
      }
    layer = next;
  }
  return length;
}
