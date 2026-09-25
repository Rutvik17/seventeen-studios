class Solution:
    def diameterOfBinaryTree(self, root: Optional[TreeNode]) -> int:
        best = 0

        def height(node):  # edges on the longest path down from node, plus one
            nonlocal best
            if not node:
                return 0
            left, right = height(node.left), height(node.right)
            best = max(best, left + right)  # the longest path that bends at node
            return 1 + max(left, right)

        height(root)
        return best
