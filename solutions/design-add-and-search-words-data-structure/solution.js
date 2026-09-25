class WordDictionary {
  constructor() {
    this.root = { next: {}, end: false }; // a trie: letter -> child node
  }

  /** @param {string} word */
  addWord(word) {
    let node = this.root;
    for (const c of word) node = node.next[c] ??= { next: {}, end: false };
    node.end = true;
  }

  /** @param {string} word @return {boolean} */
  search(word) {
    const find = (node, i) => {
      if (i === word.length) return node.end;
      if (word[i] === '.') return Object.values(node.next).some((child) => find(child, i + 1)); // any letter: try every child
      const child = node.next[word[i]];
      return child !== undefined && find(child, i + 1);
    };
    return find(this.root, 0);
  }
}
