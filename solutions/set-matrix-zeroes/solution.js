/**
 * @param {number[][]} matrix
 * @return {void} Do not return anything, modify matrix in-place instead.
 */
function setZeroes(matrix) {
  const rows = matrix.length;
  const cols = matrix[0].length;
  // Use the first row and column as the notes of which columns and rows to clear.
  // Their own cells are needed for that, so remember separately whether they had a 0.
  const firstRow = matrix[0].includes(0);
  const firstCol = matrix.some((row) => row[0] === 0);
  for (let r = 1; r < rows; r++) for (let c = 1; c < cols; c++) if (matrix[r][c] === 0) matrix[r][0] = matrix[0][c] = 0;
  for (let r = 1; r < rows; r++) for (let c = 1; c < cols; c++) if (matrix[r][0] === 0 || matrix[0][c] === 0) matrix[r][c] = 0;
  if (firstRow) matrix[0].fill(0);
  if (firstCol) for (const row of matrix) row[0] = 0;
}
