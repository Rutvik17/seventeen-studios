class Solution:
    def rotate(self, matrix: List[List[int]]) -> None:
        n = len(matrix)
        # A quarter turn clockwise is a flip across the main diagonal, then each row reversed.
        for i in range(n):
            for j in range(i + 1, n):
                matrix[i][j], matrix[j][i] = matrix[j][i], matrix[i][j]
        for row in matrix:
            row.reverse()
