public class Solution {
    private int[] preorder;
    private Dictionary<int, int> where; // each value's place in inorder
    private int next; // the next preorder value: the root of the next subtree to build

    public TreeNode BuildTree(int[] preorder, int[] inorder) {
        this.preorder = preorder;
        where = new Dictionary<int, int>();
        for (int i = 0; i < inorder.Length; i++) where[inorder[i]] = i;
        next = 0;
        return Build(0, inorder.Length);
    }

    // The subtree made of inorder[lo..hi).
    private TreeNode Build(int lo, int hi) {
        if (lo >= hi) return null;
        var root = new TreeNode(preorder[next++]);
        int m = where[root.val]; // left of it in inorder is the left subtree, right of it the right
        root.left = Build(lo, m);
        root.right = Build(m + 1, hi);
        return root;
    }
}
