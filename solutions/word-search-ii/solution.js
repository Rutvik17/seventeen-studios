/**
 * @param {character[][]} board
 * @param {string[]} words
 * @return {string[]}
 */
function findWords(board, words) {
  // One trie of all the words; a node keeps the word that ends there.
  const root = new Map();
  for (const w of words) {
    let node = root;
    for (const c of w) {
      if (!node.has(c)) node.set(c, new Map());
      node = node.get(c);
    }
    node.word = w;
  }
  const rows = board.length;
  const cols = board[0].length;
  const found = [];
  const dfs = (r, c, parent) => {
    const ch = board[r][c];
    const node = parent.get(ch);
    if (node.word) {
      found.push(node.word); // take it once
      node.word = null;
    }
    board[r][c] = '#'; // in use on this path
    for (const [nr, nc] of [[r + 1, c], [r - 1, c], [r, c + 1], [r, c - 1]]) {
      if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && node.has(board[nr][nc])) dfs(nr, nc, node);
    }
    board[r][c] = ch;
    if (node.size === 0 && !node.word) parent.delete(ch); // nothing left to find below: prune the branch
  };
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) if (root.has(board[r][c])) dfs(r, c, root);
  return found;
}
