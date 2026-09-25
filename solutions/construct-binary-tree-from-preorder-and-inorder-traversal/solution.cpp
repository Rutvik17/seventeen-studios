class Solution {
    unordered_map<int, int> where; // each value's place in inorder
    int next = 0; // the next preorder value: the root of the next subtree to build

    // The subtree made of inorder[lo..hi).
    TreeNode* build(const vector<int>& preorder, int lo, int hi) {
        if (lo >= hi) return nullptr;
        TreeNode* root = new TreeNode(preorder[next++]);
        int m = where[root->val]; // left of it in inorder is the left subtree, right of it the right
        root->left = build(preorder, lo, m);
        root->right = build(preorder, m + 1, hi);
        return root;
    }
public:
    TreeNode* buildTree(vector<int>& preorder, vector<int>& inorder) {
        for (int i = 0; i < (int)inorder.size(); i++) where[inorder[i]] = i;
        next = 0;
        return build(preorder, 0, inorder.size());
    }
};
