class Solution {
    private int[][] h;
    private int rows, cols;

    public List<List<Integer>> pacificAtlantic(int[][] heights) {
        h = heights;
        rows = heights.length;
        cols = heights[0].length;
        boolean[][] pacific = new boolean[rows][cols], atlantic = new boolean[rows][cols];
        // Walk uphill from each ocean's edge: every cell reached can drain down into that ocean.
        for (int r = 0; r < rows; r++) {
            reach(r, 0, pacific);
            reach(r, cols - 1, atlantic);
        }
        for (int c = 0; c < cols; c++) {
            reach(0, c, pacific);
            reach(rows - 1, c, atlantic);
        }
        List<List<Integer>> out = new ArrayList<>();
        for (int r = 0; r < rows; r++)
            for (int c = 0; c < cols; c++)
                if (pacific[r][c] && atlantic[r][c]) out.add(List.of(r, c));
        return out;
    }

    private void reach(int r, int c, boolean[][] seen) {
        if (seen[r][c]) return;
        seen[r][c] = true;
        Deque<int[]> stack = new ArrayDeque<>();
        stack.push(new int[] {r, c});
        int[][] moves = {{1, 0}, {-1, 0}, {0, 1}, {0, -1}};
        while (!stack.isEmpty()) {
            int[] p = stack.pop();
            for (int[] m : moves) {
                int x = p[0] + m[0], y = p[1] + m[1];
                if (x >= 0 && x < rows && y >= 0 && y < cols && !seen[x][y] && h[x][y] >= h[p[0]][p[1]]) {
                    seen[x][y] = true;
                    stack.push(new int[] {x, y});
                }
            }
        }
    }
}
