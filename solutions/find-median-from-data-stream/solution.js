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

class MedianFinder {
  constructor() {
    // low: the smaller half, largest on top; high: the larger half, smallest on top.
    // low holds the same number as high, or one more.
    this.low = new Heap((a, b) => a > b);
    this.high = new Heap((a, b) => a < b);
  }

  /** @param {number} num */
  addNum(num) {
    this.low.push(num);
    this.high.push(this.low.pop()); // the largest of the low half moves up
    if (this.high.size > this.low.size) this.low.push(this.high.pop()); // rebalance
  }

  /** @return {number} */
  findMedian() {
    return this.low.size > this.high.size ? this.low.peek() : (this.low.peek() + this.high.peek()) / 2;
  }
}
