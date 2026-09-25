class Solution {
    public boolean isSubtree(TreeNode root, TreeNode subRoot) {
        // Write each tree in preorder, "^" before every value and "#" for every gap.
        // A subtree is then exactly a run of the big tree's text.
        StringBuilder t = new StringBuilder(), p = new StringBuilder();
        write(root, t);
        write(subRoot, p);
        String text = t.toString(), pat = p.toString();
        // Knuth-Morris-Pratt: fail[i] is the longest proper prefix of pat[0..i] that is also its suffix.
        int[] fail = new int[pat.length()];
        for (int i = 1, k = 0; i < pat.length(); i++) {
            while (k > 0 && pat.charAt(i) != pat.charAt(k)) k = fail[k - 1];
            if (pat.charAt(i) == pat.charAt(k)) k++;
            fail[i] = k;
        }
        for (int i = 0, k = 0; i < text.length(); i++) {
            while (k > 0 && text.charAt(i) != pat.charAt(k)) k = fail[k - 1];
            if (text.charAt(i) == pat.charAt(k)) k++;
            if (k == pat.length()) return true;
        }
        return false;
    }

    private void write(TreeNode node, StringBuilder out) {
        if (node == null) {
            out.append('#');
            return;
        }
        out.append('^').append(node.val);
        write(node.left, out);
        write(node.right, out);
    }
}
