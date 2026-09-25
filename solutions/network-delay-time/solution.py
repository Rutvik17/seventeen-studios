class Solution:
    def networkDelayTime(self, times: List[List[int]], n: int, k: int) -> int:
        out_of = defaultdict(list)
        for u, v, w in times:
            out_of[u].append((v, w))
        # Dijkstra: always settle the unsettled node the signal reaches soonest.
        arrive = {}
        heap = [(0, k)]
        while heap:
            t, u = heappop(heap)
            if u in arrive:
                continue  # settled already, by a quicker route
            arrive[u] = t
            for v, w in out_of[u]:
                if v not in arrive:
                    heappush(heap, (t + w, v))
        return max(arrive.values()) if len(arrive) == n else -1
