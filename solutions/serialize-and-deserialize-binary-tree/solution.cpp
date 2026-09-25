class Codec {
    void walk(TreeNode* node, string& out) {
        if (!node) {
            out += "#,";
            return;
        }
        out += to_string(node->val) + ",";
        walk(node->left, out);
        walk(node->right, out);
    }
    TreeNode* build(istringstream& in) {
        string t;
        getline(in, t, ',');
        if (t == "#") return nullptr;
        TreeNode* node = new TreeNode(stoi(t));
        node->left = build(in);
        node->right = build(in);
        return node;
    }
public:
    // Preorder, with "#" for every missing child: "1,2,#,#,3,4,#,#,5,#,#,".
    string serialize(TreeNode* root) {
        string out;
        walk(root, out);
        return out;
    }

    // Read the tokens back in the same order: a node, then its whole left side, then its right.
    TreeNode* deserialize(string data) {
        istringstream in(data);
        return build(in);
    }
};
