class Solution:
    def longestIncreasingPath(self, matrix: List[List[int]]) -> int:
        rows, cols = len(matrix), len(matrix[0])
        moves = ((1, 0), (-1, 0), (0, 1), (0, -1))
        # Peel the matrix in layers, as in Kahn's algorithm: a cell's count is how many
        # neighbours are smaller. Cells with none start a path; removing a layer frees the next.
        smaller = [[0] * cols for _ in range(rows)]
        for r in range(rows):
            for c in range(cols):
                for dr, dc in moves:
                    x, y = r + dr, c + dc
                    if 0 <= x < rows and 0 <= y < cols and matrix[x][y] < matrix[r][c]:
                        smaller[r][c] += 1
        layer = [(r, c) for r in range(rows) for c in range(cols) if smaller[r][c] == 0]
        length = 0
        while layer:
            length += 1  # every cell in this layer ends a path of this many cells
            nxt = []
            for r, c in layer:
                for dr, dc in moves:
                    x, y = r + dr, c + dc
                    if 0 <= x < rows and 0 <= y < cols and matrix[x][y] > matrix[r][c]:
                        smaller[x][y] -= 1
                        if smaller[x][y] == 0:
                            nxt.append((x, y))
            layer = nxt
        return length
