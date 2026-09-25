public class Solution {
    public bool IsValidBST(TreeNode root) {
        return Ok(root, long.MinValue, long.MaxValue); // wider than any int, so no value is excluded
    }

    // Every node must lie strictly between the bounds its ancestors set.
    private bool Ok(TreeNode node, long lo, long hi) {
        if (node == null) return true;
        if (node.val <= lo || node.val >= hi) return false;
        return Ok(node.left, lo, node.val) && Ok(node.right, node.val, hi);
    }
}
