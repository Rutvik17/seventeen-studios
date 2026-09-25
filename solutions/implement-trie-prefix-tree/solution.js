class Trie {
  constructor() {
    this.root = { next: {}, end: false }; // next: letter -> child node
  }

  /** @param {string} word */
  insert(word) {
    let node = this.root;
    for (const c of word) node = node.next[c] ??= { next: {}, end: false };
    node.end = true;
  }

  /** The node reached by spelling s, or null. */
  walk(s) {
    let node = this.root;
    for (const c of s) {
      node = node.next[c];
      if (!node) return null;
    }
    return node;
  }

  /** @param {string} word @return {boolean} */
  search(word) {
    return this.walk(word)?.end === true;
  }

  /** @param {string} prefix @return {boolean} */
  startsWith(prefix) {
    return this.walk(prefix) !== null;
  }
}
