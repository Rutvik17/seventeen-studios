class TimeMap {
  constructor() {
    // key -> list of [timestamp, value]. Timestamps arrive increasing, so each list is sorted.
    this.store = new Map();
  }

  set(key, value, timestamp) {
    if (!this.store.has(key)) this.store.set(key, []);
    this.store.get(key).push([timestamp, value]);
  }

  get(key, timestamp) {
    const entries = this.store.get(key) ?? [];
    let lo = 0;
    let hi = entries.length; // find the first entry later than timestamp
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (entries[mid][0] <= timestamp) lo = mid + 1;
      else hi = mid;
    }
    return lo > 0 ? entries[lo - 1][1] : ''; // the one before it is the latest in time
  }
}
