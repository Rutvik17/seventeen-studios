/**
 * @param {number[][]} rooms
 * @return {void} Do not return anything, modify rooms in-place instead.
 */
function wallsAndGates(rooms) {
  const INF = 2147483647; // an empty room not yet reached
  const rows = rooms.length;
  const cols = rooms[0].length;
  // Breadth-first from every gate at once: a room is first reached from its nearest gate.
  const queue = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) if (rooms[r][c] === 0) queue.push([r, c]);
  for (let h = 0; h < queue.length; h++) {
    const [i, j] = queue[h];
    for (const [x, y] of [[i + 1, j], [i - 1, j], [i, j + 1], [i, j - 1]]) {
      if (x >= 0 && x < rows && y >= 0 && y < cols && rooms[x][y] === INF) {
        rooms[x][y] = rooms[i][j] + 1;
        queue.push([x, y]);
      }
    }
  }
}
