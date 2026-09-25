class Solution {
    public int largestRectangleArea(int[] heights) {
        int n = heights.length, best = 0, top = 0;
        int[] starts = new int[n + 1], hs = new int[n + 1]; // a stack; heights increase upward
        for (int i = 0; i <= n; i++) {
            int h = i == n ? 0 : heights[i]; // a final 0 flushes the stack
            int start = i;
            while (top > 0 && hs[top - 1] >= h) {
                top--;
                best = Math.max(best, hs[top] * (i - starts[top])); // it could stretch up to i
                start = starts[top]; // the new bar can reach back as far
            }
            starts[top] = start;
            hs[top++] = h;
        }
        return best;
    }
}
