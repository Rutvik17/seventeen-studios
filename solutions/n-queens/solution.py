class Solution:
    def solveNQueens(self, n: int) -> List[List[str]]:
        # A queen attacks along its column and both diagonals. On one "\" diagonal r - c
        # is the same; on one "/" diagonal r + c is. So three sets say what is attacked.
        cols, down, up = set(), set(), set()
        board = [["."] * n for _ in range(n)]
        out = []

        def place(r):  # rows above r each hold one queen
            if r == n:
                out.append(["".join(row) for row in board])
                return
            for c in range(n):
                if c in cols or r - c in down or r + c in up:
                    continue
                cols.add(c); down.add(r - c); up.add(r + c)
                board[r][c] = "Q"
                place(r + 1)
                board[r][c] = "."  # take it back and try the next column
                cols.remove(c); down.remove(r - c); up.remove(r + c)

        place(0)
        return out
