class Solution:
    def invertTree(self, root: Optional[TreeNode]) -> Optional[TreeNode]:
        if root:
            # Swap the children, then mirror each of them the same way.
            root.left, root.right = self.invertTree(root.right), self.invertTree(root.left)
        return root
