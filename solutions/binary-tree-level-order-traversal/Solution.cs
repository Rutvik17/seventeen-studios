public class Solution {
    public IList<IList<int>> LevelOrder(TreeNode root) {
        var out_ = new List<IList<int>>();
        var queue = new Queue<TreeNode>();
        if (root != null) queue.Enqueue(root);
        while (queue.Count > 0) {
            var level = new List<int>();
            for (int n = queue.Count; n > 0; n--) { // exactly the nodes of this level
                var node = queue.Dequeue();
                level.Add(node.val);
                if (node.left != null) queue.Enqueue(node.left);
                if (node.right != null) queue.Enqueue(node.right);
            }
            out_.Add(level);
        }
        return out_;
    }
}
