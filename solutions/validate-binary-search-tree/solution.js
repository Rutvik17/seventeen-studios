/**
 * @param {TreeNode} root
 * @return {boolean}
 */
function isValidBST(root) {
  // Every node must lie strictly between the bounds its ancestors set.
  const ok = (node, lo, hi) => {
    if (!node) return true;
    if (node.val <= lo || node.val >= hi) return false;
    return ok(node.left, lo, node.val) && ok(node.right, node.val, hi);
  };
  return ok(root, -Infinity, Infinity);
}
