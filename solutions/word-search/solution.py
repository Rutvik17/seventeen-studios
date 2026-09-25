class Solution:
    def exist(self, board: List[List[str]], word: str) -> bool:
        rows, cols = len(board), len(board[0])
        # Quick refusal: the board must hold enough of every letter the word needs.
        if Counter(word) - Counter(c for row in board for c in row):
            return False

        def trace(r, c, i):  # can word[i:] be traced starting at (r, c)?
            if not (0 <= r < rows and 0 <= c < cols) or board[r][c] != word[i]:
                return False
            if i == len(word) - 1:
                return True
            board[r][c] = "#"  # in use on this path
            found = trace(r + 1, c, i + 1) or trace(r - 1, c, i + 1) or trace(r, c + 1, i + 1) or trace(r, c - 1, i + 1)
            board[r][c] = word[i]  # free it again
            return found

        return any(trace(r, c, 0) for r in range(rows) for c in range(cols))
