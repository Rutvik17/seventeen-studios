class Solution {
    public int numIslands(char[][] grid) {
        int rows = grid.length, cols = grid[0].length, islands = 0;
        int[][] moves = {{1, 0}, {-1, 0}, {0, 1}, {0, -1}};
        for (int r = 0; r < rows; r++) {
            for (int c = 0; c < cols; c++) {
                if (grid[r][c] != '1') continue;
                islands++; // new land: sink the whole island so it is counted once
                grid[r][c] = '0';
                Deque<int[]> stack = new ArrayDeque<>();
                stack.push(new int[] {r, c});
                while (!stack.isEmpty()) {
                    int[] p = stack.pop();
                    for (int[] m : moves) {
                        int x = p[0] + m[0], y = p[1] + m[1];
                        if (x >= 0 && x < rows && y >= 0 && y < cols && grid[x][y] == '1') {
                            grid[x][y] = '0';
                            stack.push(new int[] {x, y});
                        }
                    }
                }
            }
        }
        return islands;
    }
}
