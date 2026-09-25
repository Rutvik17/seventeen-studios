class Solution:
    def spiralOrder(self, matrix: List[List[int]]) -> List[int]:
        out = []
        top, bottom, left, right = 0, len(matrix) - 1, 0, len(matrix[0]) - 1  # the ring still unread
        while top <= bottom and left <= right:
            out += matrix[top][left : right + 1]  # along the top
            out += [matrix[r][right] for r in range(top + 1, bottom + 1)]  # down the right side
            if top < bottom and left < right:  # a ring more than one row or column thick
                out += matrix[bottom][left:right][::-1]  # back along the bottom
                out += [matrix[r][left] for r in range(bottom - 1, top, -1)]  # up the left side
            top, bottom, left, right = top + 1, bottom - 1, left + 1, right - 1
        return out
