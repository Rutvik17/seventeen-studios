class Solution:
    def orangesRotting(self, grid: List[List[int]]) -> int:
        rows, cols = len(grid), len(grid[0])
        rotten = deque((r, c) for r in range(rows) for c in range(cols) if grid[r][c] == 2)
        fresh = sum(row.count(1) for row in grid)
        minutes = 0
        # Breadth-first from every rotten orange at once: each round is one minute.
        while rotten and fresh:
            for _ in range(len(rotten)):
                i, j = rotten.popleft()
                for x, y in ((i + 1, j), (i - 1, j), (i, j + 1), (i, j - 1)):
                    if 0 <= x < rows and 0 <= y < cols and grid[x][y] == 1:
                        grid[x][y] = 2
                        fresh -= 1
                        rotten.append((x, y))
            minutes += 1
        return -1 if fresh else minutes
