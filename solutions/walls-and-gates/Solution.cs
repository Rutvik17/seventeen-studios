public class Solution {
    public void WallsAndGates(int[][] rooms) {
        const int INF = int.MaxValue; // an empty room not yet reached
        int rows = rooms.Length, cols = rooms[0].Length;
        // Breadth-first from every gate at once: a room is first reached from its nearest gate.
        var queue = new Queue<(int, int)>();
        for (int r = 0; r < rows; r++)
            for (int c = 0; c < cols; c++)
                if (rooms[r][c] == 0) queue.Enqueue((r, c));
        int[][] moves = { new[] { 1, 0 }, new[] { -1, 0 }, new[] { 0, 1 }, new[] { 0, -1 } };
        while (queue.Count > 0) {
            var (i, j) = queue.Dequeue();
            foreach (var m in moves) {
                int x = i + m[0], y = j + m[1];
                if (x >= 0 && x < rows && y >= 0 && y < cols && rooms[x][y] == INF) {
                    rooms[x][y] = rooms[i][j] + 1;
                    queue.Enqueue((x, y));
                }
            }
        }
    }
}
