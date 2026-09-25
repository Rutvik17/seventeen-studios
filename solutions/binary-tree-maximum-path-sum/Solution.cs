public class Solution {
    private int best;

    public int MaxPathSum(TreeNode root) {
        best = root.val;
        Gain(root);
        return best;
    }

    // The best sum of a path going down from node (0: take nothing).
    private int Gain(TreeNode node) {
        if (node == null) return 0;
        int left = Math.Max(Gain(node.left), 0); // a negative branch is left off
        int right = Math.Max(Gain(node.right), 0);
        best = Math.Max(best, node.val + left + right); // the best path that bends at node
        return node.val + Math.Max(left, right);
    }
}
