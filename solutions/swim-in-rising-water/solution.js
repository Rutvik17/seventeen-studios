/** JavaScript has no built-in heap: a binary heap with the smallest (by `less`) on top. */
class Heap {
  constructor(less) {
    this.a = [];
    this.less = less;
  }
  get size() {
    return this.a.length;
  }
  push(x) {
    const a = this.a;
    a.push(x);
    for (let i = a.length - 1; i > 0; ) {
      const p = (i - 1) >> 1;
      if (!this.less(a[i], a[p])) break;
      [a[i], a[p]] = [a[p], a[i]];
      i = p;
    }
  }
  pop() {
    const a = this.a;
    const top = a[0];
    const last = a.pop();
    if (a.length) {
      a[0] = last;
      for (let i = 0; ; ) {
        const l = 2 * i + 1;
        let m = i;
        if (l < a.length && this.less(a[l], a[m])) m = l;
        if (l + 1 < a.length && this.less(a[l + 1], a[m])) m = l + 1;
        if (m === i) break;
        [a[i], a[m]] = [a[m], a[i]];
        i = m;
      }
    }
    return top;
  }
}

/**
 * @param {number[][]} grid
 * @return {number}
 */
function swimInWater(grid) {
  const n = grid.length;
  // Like Dijkstra, but a route's cost is its highest cell, not its sum: always extend
  // the route whose highest cell is lowest.
  const heap = new Heap((a, b) => a[0] < b[0]);
  heap.push([grid[0][0], 0, 0]);
  const seen = Array.from({ length: n }, () => new Array(n).fill(false));
  seen[0][0] = true;
  while (heap.size) {
    const [t, r, c] = heap.pop();
    if (r === n - 1 && c === n - 1) return t;
    for (const [x, y] of [[r + 1, c], [r - 1, c], [r, c + 1], [r, c - 1]]) {
      if (x >= 0 && x < n && y >= 0 && y < n && !seen[x][y]) {
        seen[x][y] = true;
        heap.push([Math.max(t, grid[x][y]), x, y]);
      }
    }
  }
  return -1;
}
