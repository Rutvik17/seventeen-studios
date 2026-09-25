class Solution {
    void write(TreeNode* node, string& out) {
        if (!node) {
            out += '#';
            return;
        }
        out += '^' + to_string(node->val);
        write(node->left, out);
        write(node->right, out);
    }
public:
    bool isSubtree(TreeNode* root, TreeNode* subRoot) {
        // Write each tree in preorder, "^" before every value and "#" for every gap.
        // A subtree is then exactly a run of the big tree's text.
        string text, pat;
        write(root, text);
        write(subRoot, pat);
        // Knuth-Morris-Pratt: fail[i] is the longest proper prefix of pat[0..i] that is also its suffix.
        vector<int> fail(pat.size(), 0);
        for (size_t i = 1, k = 0; i < pat.size(); i++) {
            while (k && pat[i] != pat[k]) k = fail[k - 1];
            if (pat[i] == pat[k]) k++;
            fail[i] = k;
        }
        for (size_t i = 0, k = 0; i < text.size(); i++) {
            while (k && text[i] != pat[k]) k = fail[k - 1];
            if (text[i] == pat[k]) k++;
            if (k == pat.size()) return true;
        }
        return false;
    }
};
