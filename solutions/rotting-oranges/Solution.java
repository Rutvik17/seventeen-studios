class Solution {
    public int orangesRotting(int[][] grid) {
        int rows = grid.length, cols = grid[0].length, fresh = 0, minutes = 0;
        Deque<int[]> rotten = new ArrayDeque<>();
        for (int r = 0; r < rows; r++)
            for (int c = 0; c < cols; c++) {
                if (grid[r][c] == 2) rotten.add(new int[] {r, c});
                else if (grid[r][c] == 1) fresh++;
            }
        int[][] moves = {{1, 0}, {-1, 0}, {0, 1}, {0, -1}};
        // Breadth-first from every rotten orange at once: each round is one minute.
        while (!rotten.isEmpty() && fresh > 0) {
            for (int n = rotten.size(); n > 0; n--) {
                int[] p = rotten.poll();
                for (int[] m : moves) {
                    int x = p[0] + m[0], y = p[1] + m[1];
                    if (x >= 0 && x < rows && y >= 0 && y < cols && grid[x][y] == 1) {
                        grid[x][y] = 2;
                        fresh--;
                        rotten.add(new int[] {x, y});
                    }
                }
            }
            minutes++;
        }
        return fresh > 0 ? -1 : minutes;
    }
}
