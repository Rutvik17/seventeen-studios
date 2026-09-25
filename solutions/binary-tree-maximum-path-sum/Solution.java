class Solution {
    private int best;

    public int maxPathSum(TreeNode root) {
        best = root.val;
        gain(root);
        return best;
    }

    // The best sum of a path going down from node (0: take nothing).
    private int gain(TreeNode node) {
        if (node == null) return 0;
        int left = Math.max(gain(node.left), 0); // a negative branch is left off
        int right = Math.max(gain(node.right), 0);
        best = Math.max(best, node.val + left + right); // the best path that bends at node
        return node.val + Math.max(left, right);
    }
}
