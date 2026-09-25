/**
 * @param {TreeNode} root
 * @return {boolean}
 */
function isBalanced(root) {
  // The height, or -1 as soon as anything below is unbalanced.
  const height = (node) => {
    if (!node) return 0;
    const left = height(node.left);
    const right = height(node.right);
    if (left < 0 || right < 0 || Math.abs(left - right) > 1) return -1;
    return 1 + Math.max(left, right);
  };
  return height(root) >= 0;
}
