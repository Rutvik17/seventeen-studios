class Solution {
    public int swimInWater(int[][] grid) {
        int n = grid.length;
        // Like Dijkstra, but a route's cost is its highest cell, not its sum: always extend
        // the route whose highest cell is lowest. Entries are {height, row, column}.
        PriorityQueue<int[]> heap = new PriorityQueue<>((a, b) -> Integer.compare(a[0], b[0]));
        heap.add(new int[] {grid[0][0], 0, 0});
        boolean[][] seen = new boolean[n][n];
        seen[0][0] = true;
        int[][] moves = {{1, 0}, {-1, 0}, {0, 1}, {0, -1}};
        while (!heap.isEmpty()) {
            int[] e = heap.poll();
            if (e[1] == n - 1 && e[2] == n - 1) return e[0];
            for (int[] m : moves) {
                int x = e[1] + m[0], y = e[2] + m[1];
                if (x >= 0 && x < n && y >= 0 && y < n && !seen[x][y]) {
                    seen[x][y] = true;
                    heap.add(new int[] {Math.max(e[0], grid[x][y]), x, y});
                }
            }
        }
        return -1;
    }
}
