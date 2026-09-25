/**
 * @param {number[][]} matrix
 * @param {number} target
 * @return {boolean}
 */
function searchMatrix(matrix, target) {
  const cols = matrix[0].length;
  let lo = 0;
  let hi = matrix.length * cols - 1; // the matrix, read row by row, is one sorted list
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const v = matrix[Math.floor(mid / cols)][mid % cols]; // position k is row k / cols, column k % cols
    if (v === target) return true;
    if (v < target) lo = mid + 1;
    else hi = mid - 1;
  }
  return false;
}
