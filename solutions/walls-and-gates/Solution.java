class Solution {
    public void wallsAndGates(int[][] rooms) {
        final int INF = Integer.MAX_VALUE; // an empty room not yet reached
        int rows = rooms.length, cols = rooms[0].length;
        // Breadth-first from every gate at once: a room is first reached from its nearest gate.
        Deque<int[]> queue = new ArrayDeque<>();
        for (int r = 0; r < rows; r++)
            for (int c = 0; c < cols; c++)
                if (rooms[r][c] == 0) queue.add(new int[] {r, c});
        int[][] moves = {{1, 0}, {-1, 0}, {0, 1}, {0, -1}};
        while (!queue.isEmpty()) {
            int[] p = queue.poll();
            for (int[] m : moves) {
                int x = p[0] + m[0], y = p[1] + m[1];
                if (x >= 0 && x < rows && y >= 0 && y < cols && rooms[x][y] == INF) {
                    rooms[x][y] = rooms[p[0]][p[1]] + 1;
                    queue.add(new int[] {x, y});
                }
            }
        }
    }
}
