class Solution {
    public List<Integer> rightSideView(TreeNode root) {
        List<Integer> out = new ArrayList<>();
        Deque<TreeNode> queue = new ArrayDeque<>();
        if (root != null) queue.add(root);
        while (!queue.isEmpty()) {
            out.add(queue.peekLast().val); // the rightmost node of this level
            for (int n = queue.size(); n > 0; n--) {
                TreeNode node = queue.poll();
                if (node.left != null) queue.add(node.left);
                if (node.right != null) queue.add(node.right);
            }
        }
        return out;
    }
}
