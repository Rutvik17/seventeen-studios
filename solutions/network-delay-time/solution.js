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
 * @param {number[][]} times
 * @param {number} n
 * @param {number} k
 * @return {number}
 */
function networkDelayTime(times, n, k) {
  const outOf = Array.from({ length: n + 1 }, () => []);
  for (const [u, v, w] of times) outOf[u].push([v, w]);
  // Dijkstra: always settle the unsettled node the signal reaches soonest.
  const arrive = new Array(n + 1).fill(-1);
  const heap = new Heap((a, b) => a[0] < b[0]);
  heap.push([0, k]);
  let settled = 0;
  let last = 0;
  while (heap.size) {
    const [t, u] = heap.pop();
    if (arrive[u] >= 0) continue; // settled already, by a quicker route
    arrive[u] = t;
    settled++;
    last = t;
    for (const [v, w] of outOf[u]) if (arrive[v] < 0) heap.push([t + w, v]);
  }
  return settled === n ? last : -1;
}
