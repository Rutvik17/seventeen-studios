class Solution {
    // Every node must lie strictly between the bounds its ancestors set.
    bool ok(TreeNode* node, long long lo, long long hi) {
        if (!node) return true;
        if (node->val <= lo || node->val >= hi) return false;
        return ok(node->left, lo, node->val) && ok(node->right, node->val, hi);
    }
public:
    bool isValidBST(TreeNode* root) {
        return ok(root, LLONG_MIN, LLONG_MAX); // wider than any int, so no value is excluded
    }
};
