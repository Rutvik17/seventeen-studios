public class Solution {
    public int SwimInWater(int[][] grid) {
        int n = grid.Length;
        // Like Dijkstra, but a route's cost is its highest cell, not its sum: always extend
        // the route whose highest cell is lowest.
        var heap = new PriorityQueue<(int t, int r, int c), int>();
        heap.Enqueue((grid[0][0], 0, 0), grid[0][0]);
        var seen = new bool[n, n];
        seen[0, 0] = true;
        int[][] moves = { new[] { 1, 0 }, new[] { -1, 0 }, new[] { 0, 1 }, new[] { 0, -1 } };
        while (heap.Count > 0) {
            var (t, r, c) = heap.Dequeue();
            if (r == n - 1 && c == n - 1) return t;
            foreach (var m in moves) {
                int x = r + m[0], y = c + m[1];
                if (x >= 0 && x < n && y >= 0 && y < n && !seen[x, y]) {
                    seen[x, y] = true;
                    int h = Math.Max(t, grid[x][y]);
                    heap.Enqueue((h, x, y), h);
                }
            }
        }
        return -1;
    }
}
