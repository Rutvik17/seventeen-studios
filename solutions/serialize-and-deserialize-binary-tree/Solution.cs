using System.Text;

public class Codec {
    // Preorder, with "#" for every missing child: "1,2,#,#,3,4,#,#,5,#,#".
    public string Serialize(TreeNode root) {
        var sb = new StringBuilder();
        Walk(root, sb);
        return sb.ToString(1, sb.Length - 1); // drop the leading comma
    }

    private void Walk(TreeNode node, StringBuilder sb) {
        if (node == null) {
            sb.Append(",#");
            return;
        }
        sb.Append(',').Append(node.val);
        Walk(node.left, sb);
        Walk(node.right, sb);
    }

    // Read the tokens back in the same order: a node, then its whole left side, then its right.
    public TreeNode Deserialize(string data) {
        var tokens = data.Split(',');
        int i = 0;
        return Build(tokens, ref i);
    }

    private TreeNode Build(string[] tokens, ref int i) {
        string t = tokens[i++];
        if (t == "#") return null;
        var node = new TreeNode(int.Parse(t));
        node.left = Build(tokens, ref i);
        node.right = Build(tokens, ref i);
        return node;
    }
}
