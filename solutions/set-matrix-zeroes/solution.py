class Solution:
    def setZeroes(self, matrix: List[List[int]]) -> None:
        rows, cols = len(matrix), len(matrix[0])
        # Use the first row and column as the notes of which columns and rows to clear.
        # Their own cells are needed for that, so remember separately whether they had a 0.
        first_row = 0 in matrix[0]
        first_col = any(matrix[r][0] == 0 for r in range(rows))
        for r in range(1, rows):
            for c in range(1, cols):
                if matrix[r][c] == 0:
                    matrix[r][0] = matrix[0][c] = 0
        for r in range(1, rows):
            for c in range(1, cols):
                if matrix[r][0] == 0 or matrix[0][c] == 0:
                    matrix[r][c] = 0
        if first_row:
            for c in range(cols):
                matrix[0][c] = 0
        if first_col:
            for r in range(rows):
                matrix[r][0] = 0
