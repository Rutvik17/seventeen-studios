class Solution:
    def maxPathSum(self, root: Optional[TreeNode]) -> int:
        best = root.val

        def gain(node):  # the best sum of a path going down from node (0: take nothing)
            nonlocal best
            if not node:
                return 0
            left = max(gain(node.left), 0)  # a negative branch is left off
            right = max(gain(node.right), 0)
            best = max(best, node.val + left + right)  # the best path that bends at node
            return node.val + max(left, right)

        gain(root)
        return best
