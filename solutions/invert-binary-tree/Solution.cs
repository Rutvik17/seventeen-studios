public class Solution {
    public TreeNode InvertTree(TreeNode root) {
        if (root == null) return null;
        // Swap the children, then mirror each of them the same way.
        TreeNode left = root.left;
        root.left = InvertTree(root.right);
        root.right = InvertTree(left);
        return root;
    }
}
