class Solution {
    int best;
    // The best sum of a path going down from node (0: take nothing).
    int gain(TreeNode* node) {
        if (!node) return 0;
        int left = max(gain(node->left), 0); // a negative branch is left off
        int right = max(gain(node->right), 0);
        best = max(best, node->val + left + right); // the best path that bends at node
        return node->val + max(left, right);
    }
public:
    int maxPathSum(TreeNode* root) {
        best = root->val;
        gain(root);
        return best;
    }
};
