class LRUCache {
  /** @param {number} capacity */
  constructor(capacity) {
    // A JavaScript Map remembers insertion order, so re-inserting a key makes it the most
    // recent; the first key in the Map is the least recently used.
    this.cap = capacity;
    this.map = new Map();
  }

  get(key) {
    if (!this.map.has(key)) return -1;
    const val = this.map.get(key);
    this.map.delete(key);
    this.map.set(key, val); // it has just been used
    return val;
  }

  put(key, value) {
    this.map.delete(key);
    this.map.set(key, value);
    if (this.map.size > this.cap) this.map.delete(this.map.keys().next().value); // evict the oldest
  }
}
