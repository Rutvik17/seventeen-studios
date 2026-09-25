class Solution:
    def goodNodes(self, root: TreeNode) -> int:
        def count(node, best):  # best: the largest value on the path from the root
            if not node:
                return 0
            good = 1 if node.val >= best else 0
            best = max(best, node.val)
            return good + count(node.left, best) + count(node.right, best)

        return count(root, root.val)
