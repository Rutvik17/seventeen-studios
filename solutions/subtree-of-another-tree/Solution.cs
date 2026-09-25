using System.Text;

public class Solution {
    public bool IsSubtree(TreeNode root, TreeNode subRoot) {
        // Write each tree in preorder, "^" before every value and "#" for every gap.
        // A subtree is then exactly a run of the big tree's text.
        var t = new StringBuilder();
        var p = new StringBuilder();
        Write(root, t);
        Write(subRoot, p);
        string text = t.ToString(), pat = p.ToString();
        // Knuth-Morris-Pratt: fail[i] is the longest proper prefix of pat[0..i] that is also its suffix.
        var fail = new int[pat.Length];
        for (int i = 1, k = 0; i < pat.Length; i++) {
            while (k > 0 && pat[i] != pat[k]) k = fail[k - 1];
            if (pat[i] == pat[k]) k++;
            fail[i] = k;
        }
        for (int i = 0, k = 0; i < text.Length; i++) {
            while (k > 0 && text[i] != pat[k]) k = fail[k - 1];
            if (text[i] == pat[k]) k++;
            if (k == pat.Length) return true;
        }
        return false;
    }

    private void Write(TreeNode node, StringBuilder out_) {
        if (node == null) {
            out_.Append('#');
            return;
        }
        out_.Append('^').Append(node.val);
        Write(node.left, out_);
        Write(node.right, out_);
    }
}
