class Solution:
    def buildTree(self, preorder: List[int], inorder: List[int]) -> Optional[TreeNode]:
        where = {v: i for i, v in enumerate(inorder)}  # each value's place in inorder
        nxt = 0  # the next preorder value: the root of the next subtree to build

        def build(lo, hi):  # the subtree made of inorder[lo:hi]
            nonlocal nxt
            if lo >= hi:
                return None
            root = TreeNode(preorder[nxt])
            nxt += 1
            m = where[root.val]  # left of it in inorder is the left subtree, right of it the right
            root.left = build(lo, m)
            root.right = build(m + 1, hi)
            return root

        return build(0, len(inorder))
