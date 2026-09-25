class Solution:
    def solve(self, board: List[List[str]]) -> None:
        rows, cols = len(board), len(board[0])
        # An O region survives exactly when it touches the edge. Mark those as safe ("S")
        # by spreading from every O on the edge.
        stack = [(r, c) for r in range(rows) for c in range(cols) if (r in (0, rows - 1) or c in (0, cols - 1)) and board[r][c] == "O"]
        for r, c in stack:
            board[r][c] = "S"
        while stack:
            i, j = stack.pop()
            for x, y in ((i + 1, j), (i - 1, j), (i, j + 1), (i, j - 1)):
                if 0 <= x < rows and 0 <= y < cols and board[x][y] == "O":
                    board[x][y] = "S"
                    stack.append((x, y))
        # Every O left is surrounded: capture it. Then the safe ones go back to O.
        for r in range(rows):
            for c in range(cols):
                board[r][c] = "O" if board[r][c] == "S" else "X"
