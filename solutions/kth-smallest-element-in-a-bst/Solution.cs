public class Solution {
    public int KthSmallest(TreeNode root, int k) {
        // An in-order walk (left, node, right) visits a BST's values in increasing order.
        var stack = new Stack<TreeNode>();
        TreeNode node = root;
        while (true) {
            while (node != null) { // go as far left as possible, remembering the way back
                stack.Push(node);
                node = node.left;
            }
            node = stack.Pop();
            if (--k == 0) return node.val;
            node = node.right;
        }
    }
}
