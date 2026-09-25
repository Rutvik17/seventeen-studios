/**
 * @param {TreeNode} p
 * @param {TreeNode} q
 * @return {boolean}
 */
function isSameTree(p, q) {
  if (!p || !q) return p === q; // both empty, or one is missing
  return p.val === q.val && isSameTree(p.left, q.left) && isSameTree(p.right, q.right);
}
