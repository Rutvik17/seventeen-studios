/** JavaScript has no built-in heap: a binary heap with the smallest (by `less`) on top. */
class Heap {
  constructor(less) {
    this.a = [];
    this.less = less;
  }
  get size() {
    return this.a.length;
  }
  peek() {
    return this.a[0];
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
 * @param {number[][]} intervals
 * @param {number[]} queries
 * @return {number[]}
 */
function minInterval(intervals, queries) {
  intervals.sort((a, b) => a[0] - b[0]);
  const answer = new Array(queries.length).fill(-1);
  const heap = new Heap((a, b) => a[0] < b[0]); // [size, right end] of intervals that have started
  let i = 0;
  // Answer the queries from smallest to largest, so intervals only ever join and leave.
  const order = queries.map((_, k) => k).sort((a, b) => queries[a] - queries[b]);
  for (const q of order) {
    const x = queries[q];
    while (i < intervals.length && intervals[i][0] <= x) {
      // every interval starting by x
      const [l, r] = intervals[i++];
      heap.push([r - l + 1, r]);
    }
    while (heap.size && heap.peek()[1] < x) heap.pop(); // ended before x: useless now and for every later query
    if (heap.size) answer[q] = heap.peek()[0]; // the smallest interval holding x
  }
  return answer;
}
