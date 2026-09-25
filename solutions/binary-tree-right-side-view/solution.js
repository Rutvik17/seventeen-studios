/**
 * @param {TreeNode} root
 * @return {number[]}
 */
function rightSideView(root) {
  const out = [];
  let level = root ? [root] : [];
  while (level.length) {
    out.push(level[level.length - 1].val); // the rightmost node of this level
    const next = [];
    for (const n of level) {
      if (n.left) next.push(n.left);
      if (n.right) next.push(n.right);
    }
    level = next;
  }
  return out;
}
