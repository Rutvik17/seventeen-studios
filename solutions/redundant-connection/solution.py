class Solution:
    def findRedundantConnection(self, edges: List[List[int]]) -> List[int]:
        # Union-find: each node points toward a representative of its connected group.
        parent = list(range(len(edges) + 1))
        size = [1] * (len(edges) + 1)

        def find(x):
            while parent[x] != x:
                parent[x] = parent[parent[x]]  # halve the path as we go
                x = parent[x]
            return x

        for a, b in edges:
            ra, rb = find(a), find(b)
            if ra == rb:
                return [a, b]  # already connected: this edge closes a cycle
            if size[ra] < size[rb]:
                ra, rb = rb, ra
            parent[rb] = ra  # hang the smaller group under the larger
            size[ra] += size[rb]
        return []
