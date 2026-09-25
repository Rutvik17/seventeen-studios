class Solution:
    def countComponents(self, n: int, edges: List[List[int]]) -> int:
        # Union-find: start with n groups; every edge that joins two groups makes one fewer.
        parent = list(range(n))
        size = [1] * n

        def find(x):
            while parent[x] != x:
                parent[x] = parent[parent[x]]  # halve the path as we go
                x = parent[x]
            return x

        groups = n
        for a, b in edges:
            ra, rb = find(a), find(b)
            if ra == rb:
                continue  # already in one group
            if size[ra] < size[rb]:
                ra, rb = rb, ra
            parent[rb] = ra
            size[ra] += size[rb]
            groups -= 1
        return groups
