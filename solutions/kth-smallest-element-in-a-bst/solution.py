class Solution:
    def kthSmallest(self, root: Optional[TreeNode], k: int) -> int:
        # An in-order walk (left, node, right) visits a BST's values in increasing order.
        stack, node = [], root
        while True:
            while node:  # go as far left as possible, remembering the way back
                stack.append(node)
                node = node.left
            node = stack.pop()
            k -= 1
            if k == 0:
                return node.val
            node = node.right
