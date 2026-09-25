/**
 * @param {TreeNode} root
 * @return {number[][]}
 */
function levelOrder(root) {
  const out = [];
  let level = root ? [root] : [];
  while (level.length) {
    out.push(level.map((n) => n.val));
    const next = []; // the next level, left to right
    for (const n of level) {
      if (n.left) next.push(n.left);
      if (n.right) next.push(n.right);
    }
    level = next;
  }
  return out;
}
