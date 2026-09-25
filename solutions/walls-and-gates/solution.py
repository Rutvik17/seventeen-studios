class Solution:
    def wallsAndGates(self, rooms: List[List[int]]) -> None:
        INF = 2147483647  # an empty room not yet reached
        rows, cols = len(rooms), len(rooms[0])
        # Breadth-first from every gate at once: a room is first reached from its nearest gate.
        queue = deque((r, c) for r in range(rows) for c in range(cols) if rooms[r][c] == 0)
        while queue:
            i, j = queue.popleft()
            for x, y in ((i + 1, j), (i - 1, j), (i, j + 1), (i, j - 1)):
                if 0 <= x < rows and 0 <= y < cols and rooms[x][y] == INF:
                    rooms[x][y] = rooms[i][j] + 1
                    queue.append((x, y))
