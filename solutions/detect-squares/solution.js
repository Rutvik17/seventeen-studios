class DetectSquares {
  constructor() {
    this.col = new Map(); // x -> Map(y -> how many points added there)
  }

  /** @param {number[]} point */
  add([x, y]) {
    if (!this.col.has(x)) this.col.set(x, new Map());
    const c = this.col.get(x);
    c.set(y, (c.get(y) ?? 0) + 1);
  }

  /** @param {number[]} point @return {number} */
  count([x, y]) {
    const at = (a, b) => this.col.get(a)?.get(b) ?? 0;
    let total = 0;
    // A point straight above or below the query fixes the side length d; the square then
    // lies to the right or to the left, and needs its other two corners.
    for (const [y2, n] of this.col.get(x) ?? []) {
      const d = y2 - y;
      if (d === 0) continue;
      for (const x2 of [x + d, x - d]) total += n * at(x2, y) * at(x2, y2);
    }
    return total;
  }
}
