public class Solution {
    public IList<int> RightSideView(TreeNode root) {
        var out_ = new List<int>();
        var level = new List<TreeNode>();
        if (root != null) level.Add(root);
        while (level.Count > 0) {
            out_.Add(level[level.Count - 1].val); // the rightmost node of this level
            var next = new List<TreeNode>();
            foreach (var n in level) {
                if (n.left != null) next.Add(n.left);
                if (n.right != null) next.Add(n.right);
            }
            level = next;
        }
        return out_;
    }
}
