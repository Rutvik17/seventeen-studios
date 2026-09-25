class Solution:
    def numIslands(self, grid: List[List[str]]) -> int:
        rows, cols = len(grid), len(grid[0])
        islands = 0
        for r in range(rows):
            for c in range(cols):
                if grid[r][c] != "1":
                    continue
                islands += 1  # new land: sink the whole island so it is counted once
                grid[r][c] = "0"
                stack = [(r, c)]
                while stack:
                    i, j = stack.pop()
                    for x, y in ((i + 1, j), (i - 1, j), (i, j + 1), (i, j - 1)):
                        if 0 <= x < rows and 0 <= y < cols and grid[x][y] == "1":
                            grid[x][y] = "0"
                            stack.append((x, y))
        return islands
