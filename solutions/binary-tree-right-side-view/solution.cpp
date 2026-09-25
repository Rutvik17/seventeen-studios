class Solution {
public:
    vector<int> rightSideView(TreeNode* root) {
        vector<int> out;
        queue<TreeNode*> q;
        if (root) q.push(root);
        while (!q.empty()) {
            out.push_back(q.back()->val); // the rightmost node of this level
            for (int n = q.size(); n > 0; n--) {
                TreeNode* node = q.front();
                q.pop();
                if (node->left) q.push(node->left);
                if (node->right) q.push(node->right);
            }
        }
        return out;
    }
};
