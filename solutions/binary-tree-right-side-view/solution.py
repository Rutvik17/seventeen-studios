class Solution:
    def rightSideView(self, root: Optional[TreeNode]) -> List[int]:
        out = []
        queue = deque([root] if root else [])
        while queue:
            out.append(queue[-1].val)  # the rightmost node of this level
            for _ in range(len(queue)):
                node = queue.popleft()
                if node.left:
                    queue.append(node.left)
                if node.right:
                    queue.append(node.right)
        return out
