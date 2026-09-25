class Solution:
    def levelOrder(self, root: Optional[TreeNode]) -> List[List[int]]:
        out = []
        queue = deque([root] if root else [])
        while queue:
            level = []
            for _ in range(len(queue)):  # exactly the nodes of this level
                node = queue.popleft()
                level.append(node.val)
                if node.left:
                    queue.append(node.left)
                if node.right:
                    queue.append(node.right)
            out.append(level)
        return out
