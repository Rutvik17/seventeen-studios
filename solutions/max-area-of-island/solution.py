class Solution:
    def maxAreaOfIsland(self, grid: List[List[int]]) -> int:
        rows, cols = len(grid), len(grid[0])
        best = 0
        for r in range(rows):
            for c in range(cols):
                if grid[r][c] != 1:
                    continue
                grid[r][c] = 0  # sink each square as it is counted, so none is counted twice
                stack, area = [(r, c)], 0
                while stack:
                    i, j = stack.pop()
                    area += 1
                    for x, y in ((i + 1, j), (i - 1, j), (i, j + 1), (i, j - 1)):
                        if 0 <= x < rows and 0 <= y < cols and grid[x][y] == 1:
                            grid[x][y] = 0
                            stack.append((x, y))
                best = max(best, area)
        return best
