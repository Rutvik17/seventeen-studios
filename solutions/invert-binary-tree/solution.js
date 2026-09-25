/**
 * @param {TreeNode} root
 * @return {TreeNode}
 */
function invertTree(root) {
  if (root) {
    // Swap the children, then mirror each of them the same way.
    [root.left, root.right] = [invertTree(root.right), invertTree(root.left)];
  }
  return root;
}
