class Solution:
    def searchMatrix(self, matrix: List[List[int]], target: int) -> bool:
        rows, cols = len(matrix), len(matrix[0])
        lo, hi = 0, rows * cols - 1  # the matrix, read row by row, is one sorted list
        while lo <= hi:
            mid = (lo + hi) // 2
            v = matrix[mid // cols][mid % cols]  # position k is row k // cols, column k % cols
            if v == target:
                return True
            if v < target:
                lo = mid + 1
            else:
                hi = mid - 1
        return False
