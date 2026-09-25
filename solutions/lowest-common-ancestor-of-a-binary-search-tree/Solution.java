class Solution {
    public TreeNode lowestCommonAncestor(TreeNode root, TreeNode p, TreeNode q) {
        TreeNode node = root;
        while (node != null) {
            if (p.val < node.val && q.val < node.val) node = node.left; // both are in the left subtree
            else if (p.val > node.val && q.val > node.val) node = node.right; // both are in the right subtree
            else return node; // they split here (or one of them is here)
        }
        return null;
    }
}
