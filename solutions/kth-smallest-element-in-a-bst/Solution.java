class Solution {
    public int kthSmallest(TreeNode root, int k) {
        // An in-order walk (left, node, right) visits a BST's values in increasing order.
        Deque<TreeNode> stack = new ArrayDeque<>();
        TreeNode node = root;
        while (true) {
            while (node != null) { // go as far left as possible, remembering the way back
                stack.push(node);
                node = node.left;
            }
            node = stack.pop();
            if (--k == 0) return node.val;
            node = node.right;
        }
    }
}
