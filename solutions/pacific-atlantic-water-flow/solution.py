class Solution:
    def pacificAtlantic(self, heights: List[List[int]]) -> List[List[int]]:
        rows, cols = len(heights), len(heights[0])

        # Walk uphill from an ocean's edge: every cell reached can drain down into that ocean.
        def reach(starts):
            seen = set(starts)
            stack = list(starts)
            while stack:
                i, j = stack.pop()
                for x, y in ((i + 1, j), (i - 1, j), (i, j + 1), (i, j - 1)):
                    if 0 <= x < rows and 0 <= y < cols and (x, y) not in seen and heights[x][y] >= heights[i][j]:
                        seen.add((x, y))
                        stack.append((x, y))
            return seen

        pacific = reach([(0, c) for c in range(cols)] + [(r, 0) for r in range(rows)])
        atlantic = reach([(rows - 1, c) for c in range(cols)] + [(r, cols - 1) for r in range(rows)])
        return [[r, c] for r in range(rows) for c in range(cols) if (r, c) in pacific and (r, c) in atlantic]
