/**
 * @param {TreeNode} root
 * @return {number}
 */
function goodNodes(root) {
  // best: the largest value on the path from the root.
  const count = (node, best) => {
    if (!node) return 0;
    const good = node.val >= best ? 1 : 0;
    best = Math.max(best, node.val);
    return good + count(node.left, best) + count(node.right, best);
  };
  return count(root, root.val);
}
