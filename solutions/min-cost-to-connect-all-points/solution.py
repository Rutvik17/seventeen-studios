class Solution:
    def minCostConnectPoints(self, points: List[List[int]]) -> int:
        # Prim's algorithm on the complete graph: grow one tree from point 0, always
        # adding the outside point that is cheapest to connect to it.
        n = len(points)
        cost = [float("inf")] * n  # cheapest link from each outside point to the tree
        cost[0] = 0
        inside = [False] * n
        total = 0
        for _ in range(n):
            u = min((i for i in range(n) if not inside[i]), key=lambda i: cost[i])
            inside[u] = True
            total += cost[u]
            for v in range(n):  # u may offer a cheaper link to the points still outside
                if not inside[v]:
                    d = abs(points[u][0] - points[v][0]) + abs(points[u][1] - points[v][1])
                    cost[v] = min(cost[v], d)
        return total
