/**
 * @param {number[]} preorder
 * @param {number[]} inorder
 * @return {TreeNode}
 */
function buildTree(preorder, inorder) {
  const where = new Map(inorder.map((v, i) => [v, i])); // each value's place in inorder
  let next = 0; // the next preorder value: the root of the next subtree to build
  const build = (lo, hi) => {
    // the subtree made of inorder[lo..hi)
    if (lo >= hi) return null;
    const root = new TreeNode(preorder[next++]);
    const m = where.get(root.val); // left of it in inorder is the left subtree, right of it the right
    root.left = build(lo, m);
    root.right = build(m + 1, hi);
    return root;
  };
  return build(0, inorder.length);
}
