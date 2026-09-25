/**
 * @param {TreeNode} root
 * @param {number} k
 * @return {number}
 */
function kthSmallest(root, k) {
  // An in-order walk (left, node, right) visits a BST's values in increasing order.
  const stack = [];
  let node = root;
  for (;;) {
    while (node) {
      // go as far left as possible, remembering the way back
      stack.push(node);
      node = node.left;
    }
    node = stack.pop();
    if (--k === 0) return node.val;
    node = node.right;
  }
}
