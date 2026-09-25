class Solution {
    private int best;

    public int diameterOfBinaryTree(TreeNode root) {
        best = 0;
        height(root);
        return best;
    }

    private int height(TreeNode node) {
        if (node == null) return 0;
        int left = height(node.left), right = height(node.right);
        best = Math.max(best, left + right); // the longest path that bends at node
        return 1 + Math.max(left, right);
    }
}
