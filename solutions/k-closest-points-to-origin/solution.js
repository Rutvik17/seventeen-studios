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
 * @param {number[][]} points
 * @param {number} k
 * @return {number[][]}
 */
function kClosest(points, k) {
  // A max-heap of the k closest so far. Squared distance x² + y² orders points
  // the same as distance, without a square root.
  const d = ([x, y]) => x * x + y * y;
  const heap = new Heap((a, b) => d(a) > d(b));
  for (const p of points) {
    heap.push(p);
    if (heap.size > k) heap.pop(); // the farthest of k + 1 is not among the closest k
  }
  return heap.a;
}
