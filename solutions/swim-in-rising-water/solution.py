class Solution:
    def swimInWater(self, grid: List[List[int]]) -> int:
        n = len(grid)
        # Like Dijkstra, but a route's cost is its highest cell, not its sum: always extend
        # the route whose highest cell is lowest.
        heap = [(grid[0][0], 0, 0)]
        seen = {(0, 0)}
        while heap:
            t, r, c = heappop(heap)
            if (r, c) == (n - 1, n - 1):
                return t
            for x, y in ((r + 1, c), (r - 1, c), (r, c + 1), (r, c - 1)):
                if 0 <= x < n and 0 <= y < n and (x, y) not in seen:
                    seen.add((x, y))
                    heappush(heap, (max(t, grid[x][y]), x, y))
        return -1
