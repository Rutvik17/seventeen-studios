public class Solution {
    private int best;

    public int DiameterOfBinaryTree(TreeNode root) {
        best = 0;
        Height(root);
        return best;
    }

    private int Height(TreeNode node) {
        if (node == null) return 0;
        int left = Height(node.left), right = Height(node.right);
        best = Math.Max(best, left + right); // the longest path that bends at node
        return 1 + Math.Max(left, right);
    }
}
