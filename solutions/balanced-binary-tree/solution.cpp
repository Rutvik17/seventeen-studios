class Solution {
    // The height, or -1 as soon as anything below is unbalanced.
    int height(TreeNode* node) {
        if (!node) return 0;
        int left = height(node->left), right = height(node->right);
        if (left < 0 || right < 0 || abs(left - right) > 1) return -1;
        return 1 + max(left, right);
    }
public:
    bool isBalanced(TreeNode* root) {
        return height(root) >= 0;
    }
};
