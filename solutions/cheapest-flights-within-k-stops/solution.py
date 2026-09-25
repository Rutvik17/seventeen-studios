class Solution:
    def findCheapestPrice(self, n: int, flights: List[List[int]], src: int, dst: int, k: int) -> int:
        # Bellman-Ford, stopped after k + 1 rounds: after round r, cost[v] is the cheapest
        # way to v using at most r flights (at most r - 1 stops).
        cost = [float("inf")] * n
        cost[src] = 0
        for _ in range(k + 1):
            before = cost[:]  # read last round's costs, so one round adds only one flight
            for u, v, p in flights:
                if before[u] + p < cost[v]:
                    cost[v] = before[u] + p
        return -1 if cost[dst] == float("inf") else cost[dst]
