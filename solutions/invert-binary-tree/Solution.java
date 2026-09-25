class Solution {
    public TreeNode invertTree(TreeNode root) {
        if (root == null) return null;
        // Swap the children, then mirror each of them the same way.
        TreeNode left = root.left;
        root.left = invertTree(root.right);
        root.right = invertTree(left);
        return root;
    }
}
