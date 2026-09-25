public class Solution {
    public int GoodNodes(TreeNode root) {
        return Count(root, root.val);
    }

    // best: the largest value on the path from the root.
    private int Count(TreeNode node, int best) {
        if (node == null) return 0;
        int good = node.val >= best ? 1 : 0;
        best = Math.Max(best, node.val);
        return good + Count(node.left, best) + Count(node.right, best);
    }
}
