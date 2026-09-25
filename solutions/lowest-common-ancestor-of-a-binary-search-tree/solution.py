class Solution:
    def lowestCommonAncestor(self, root: 'TreeNode', p: 'TreeNode', q: 'TreeNode') -> 'TreeNode':
        node = root
        while node:
            if p.val < node.val and q.val < node.val:
                node = node.left  # both are in the left subtree
            elif p.val > node.val and q.val > node.val:
                node = node.right  # both are in the right subtree
            else:
                return node  # they split here (or one of them is here)
