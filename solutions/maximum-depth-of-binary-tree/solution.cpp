class Solution {
public:
    int maxDepth(TreeNode* root) {
        // An empty tree has depth 0; otherwise one for this node plus the deeper side.
        if (!root) return 0;
        return 1 + max(maxDepth(root->left), maxDepth(root->right));
    }
};
