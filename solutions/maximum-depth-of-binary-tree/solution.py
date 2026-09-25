class Solution:
    def maxDepth(self, root: Optional[TreeNode]) -> int:
        # An empty tree has depth 0; otherwise one for this node plus the deeper side.
        if not root:
            return 0
        return 1 + max(self.maxDepth(root.left), self.maxDepth(root.right))
