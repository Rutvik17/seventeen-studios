class Solution:
    def isValidBST(self, root: Optional[TreeNode]) -> bool:
        # Every node must lie strictly between the bounds its ancestors set.
        def ok(node, lo, hi):
            if not node:
                return True
            if not lo < node.val < hi:
                return False
            return ok(node.left, lo, node.val) and ok(node.right, node.val, hi)

        return ok(root, float("-inf"), float("inf"))
