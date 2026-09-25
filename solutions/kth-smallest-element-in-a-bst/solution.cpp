class Solution {
public:
    int kthSmallest(TreeNode* root, int k) {
        // An in-order walk (left, node, right) visits a BST's values in increasing order.
        stack<TreeNode*> st;
        TreeNode* node = root;
        while (true) {
            while (node) { // go as far left as possible, remembering the way back
                st.push(node);
                node = node->left;
            }
            node = st.top();
            st.pop();
            if (--k == 0) return node->val;
            node = node->right;
        }
    }
};
