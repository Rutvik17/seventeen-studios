class Solution {
    public int longestIncreasingPath(int[][] matrix) {
        int rows = matrix.length, cols = matrix[0].length;
        int[][] moves = {{1, 0}, {-1, 0}, {0, 1}, {0, -1}};
        // Peel the matrix in layers, as in Kahn's algorithm: a cell's count is how many
        // neighbours are smaller. Cells with none start a path; removing a layer frees the next.
        int[][] smaller = new int[rows][cols];
        List<int[]> layer = new ArrayList<>();
        for (int r = 0; r < rows; r++)
            for (int c = 0; c < cols; c++) {
                for (int[] m : moves) {
                    int x = r + m[0], y = c + m[1];
                    if (x >= 0 && x < rows && y >= 0 && y < cols && matrix[x][y] < matrix[r][c]) smaller[r][c]++;
                }
                if (smaller[r][c] == 0) layer.add(new int[] {r, c});
            }
        int length = 0;
        while (!layer.isEmpty()) {
            length++; // every cell in this layer ends a path of this many cells
            List<int[]> next = new ArrayList<>();
            for (int[] p : layer)
                for (int[] m : moves) {
                    int x = p[0] + m[0], y = p[1] + m[1];
                    if (x >= 0 && x < rows && y >= 0 && y < cols && matrix[x][y] > matrix[p[0]][p[1]] && --smaller[x][y] == 0) next.add(new int[] {x, y});
                }
            layer = next;
        }
        return length;
    }
}
