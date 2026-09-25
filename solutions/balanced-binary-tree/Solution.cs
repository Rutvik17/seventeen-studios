public class Solution {
    public bool IsBalanced(TreeNode root) {
        return Height(root) >= 0;
    }

    // The height, or -1 as soon as anything below is unbalanced.
    private int Height(TreeNode node) {
        if (node == null) return 0;
        int left = Height(node.left), right = Height(node.right);
        if (left < 0 || right < 0 || Math.Abs(left - right) > 1) return -1;
        return 1 + Math.Max(left, right);
    }
}
