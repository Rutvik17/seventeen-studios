/**
 * @param {number[][]} heights
 * @return {number[][]}
 */
function pacificAtlantic(heights) {
  const rows = heights.length;
  const cols = heights[0].length;
  // Walk uphill from an ocean's edge: every cell reached can drain down into that ocean.
  const reach = (starts) => {
    const seen = Array.from({ length: rows }, () => new Array(cols).fill(false));
    for (const [r, c] of starts) seen[r][c] = true;
    const stack = [...starts];
    while (stack.length) {
      const [i, j] = stack.pop();
      for (const [x, y] of [[i + 1, j], [i - 1, j], [i, j + 1], [i, j - 1]]) {
        if (x >= 0 && x < rows && y >= 0 && y < cols && !seen[x][y] && heights[x][y] >= heights[i][j]) {
          seen[x][y] = true;
          stack.push([x, y]);
        }
      }
    }
    return seen;
  };
  const edge = (f) => [...Array(rows).keys()].flatMap((r) => [...Array(cols).keys()].filter((c) => f(r, c)).map((c) => [r, c]));
  const pacific = reach(edge((r, c) => r === 0 || c === 0));
  const atlantic = reach(edge((r, c) => r === rows - 1 || c === cols - 1));
  return edge((r, c) => pacific[r][c] && atlantic[r][c]);
}
