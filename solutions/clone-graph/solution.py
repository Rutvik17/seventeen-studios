class Solution:
    def cloneGraph(self, node: Optional["Node"]) -> Optional["Node"]:
        copies = {}  # original node -> its copy

        def clone(n):
            if n in copies:
                return copies[n]
            copy = Node(n.val)
            copies[n] = copy  # recorded before the neighbours, so a cycle back to n finds it
            copy.neighbors = [clone(m) for m in n.neighbors]
            return copy

        return clone(node) if node else None
