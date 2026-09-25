class Solution {
    private int[] preorder;
    private Map<Integer, Integer> where; // each value's place in inorder
    private int next; // the next preorder value: the root of the next subtree to build

    public TreeNode buildTree(int[] preorder, int[] inorder) {
        this.preorder = preorder;
        where = new HashMap<>();
        for (int i = 0; i < inorder.length; i++) where.put(inorder[i], i);
        next = 0;
        return build(0, inorder.length);
    }

    // The subtree made of inorder[lo..hi).
    private TreeNode build(int lo, int hi) {
        if (lo >= hi) return null;
        TreeNode root = new TreeNode(preorder[next++]);
        int m = where.get(root.val); // left of it in inorder is the left subtree, right of it the right
        root.left = build(lo, m);
        root.right = build(m + 1, hi);
        return root;
    }
}
