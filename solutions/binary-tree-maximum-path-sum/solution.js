/**
 * @param {TreeNode} root
 * @return {number}
 */
function maxPathSum(root) {
  let best = root.val;
  // The best sum of a path going down from node (0: take nothing).
  const gain = (node) => {
    if (!node) return 0;
    const left = Math.max(gain(node.left), 0); // a negative branch is left off
    const right = Math.max(gain(node.right), 0);
    best = Math.max(best, node.val + left + right); // the best path that bends at node
    return node.val + Math.max(left, right);
  };
  gain(root);
  return best;
}
