class Solution {
    public int maxAreaOfIsland(int[][] grid) {
        int rows = grid.length, cols = grid[0].length, best = 0;
        int[][] moves = {{1, 0}, {-1, 0}, {0, 1}, {0, -1}};
        for (int r = 0; r < rows; r++) {
            for (int c = 0; c < cols; c++) {
                if (grid[r][c] != 1) continue;
                grid[r][c] = 0; // sink each square as it is counted, so none is counted twice
                Deque<int[]> stack = new ArrayDeque<>();
                stack.push(new int[] {r, c});
                int area = 0;
                while (!stack.isEmpty()) {
                    int[] p = stack.pop();
                    area++;
                    for (int[] m : moves) {
                        int x = p[0] + m[0], y = p[1] + m[1];
                        if (x >= 0 && x < rows && y >= 0 && y < cols && grid[x][y] == 1) {
                            grid[x][y] = 0;
                            stack.push(new int[] {x, y});
                        }
                    }
                }
                best = Math.max(best, area);
            }
        }
        return best;
    }
}
