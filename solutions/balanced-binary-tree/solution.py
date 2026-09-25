class Solution:
    def isBalanced(self, root: Optional[TreeNode]) -> bool:
        def height(node):  # the height, or -1 as soon as anything below is unbalanced
            if not node:
                return 0
            left, right = height(node.left), height(node.right)
            if left < 0 or right < 0 or abs(left - right) > 1:
                return -1
            return 1 + max(left, right)

        return height(root) >= 0
