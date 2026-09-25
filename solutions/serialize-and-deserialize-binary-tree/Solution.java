class Codec {
    // Preorder, with "#" for every missing child: "1,2,#,#,3,4,#,#,5,#,#".
    public String serialize(TreeNode root) {
        StringBuilder sb = new StringBuilder();
        walk(root, sb);
        return sb.substring(1); // drop the leading comma
    }

    private void walk(TreeNode node, StringBuilder sb) {
        if (node == null) {
            sb.append(",#");
            return;
        }
        sb.append(',').append(node.val);
        walk(node.left, sb);
        walk(node.right, sb);
    }

    // Read the tokens back in the same order: a node, then its whole left side, then its right.
    public TreeNode deserialize(String data) {
        String[] tokens = data.split(",");
        int[] i = {0};
        return build(tokens, i);
    }

    private TreeNode build(String[] tokens, int[] i) {
        String t = tokens[i[0]++];
        if (t.equals("#")) return null;
        TreeNode node = new TreeNode(Integer.parseInt(t));
        node.left = build(tokens, i);
        node.right = build(tokens, i);
        return node;
    }
}
