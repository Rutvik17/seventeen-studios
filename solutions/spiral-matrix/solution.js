/**
 * @param {number[][]} matrix
 * @return {number[]}
 */
function spiralOrder(matrix) {
  const out = [];
  let [top, bottom, left, right] = [0, matrix.length - 1, 0, matrix[0].length - 1]; // the ring still unread
  while (top <= bottom && left <= right) {
    for (let c = left; c <= right; c++) out.push(matrix[top][c]); // along the top
    for (let r = top + 1; r <= bottom; r++) out.push(matrix[r][right]); // down the right side
    if (top < bottom && left < right) {
      // a ring more than one row or column thick
      for (let c = right - 1; c >= left; c--) out.push(matrix[bottom][c]); // back along the bottom
      for (let r = bottom - 1; r > top; r--) out.push(matrix[r][left]); // up the left side
    }
    [top, bottom, left, right] = [top + 1, bottom - 1, left + 1, right - 1];
  }
  return out;
}
