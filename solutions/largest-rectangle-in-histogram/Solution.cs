public class Solution {
    public int LargestRectangleArea(int[] heights) {
        var stack = new Stack<(int start, int h)>(); // heights increase upward
        int best = 0, n = heights.Length;
        for (int i = 0; i <= n; i++) {
            int h = i == n ? 0 : heights[i]; // a final 0 flushes the stack
            int start = i;
            while (stack.Count > 0 && stack.Peek().h >= h) {
                var (j, hj) = stack.Pop();
                best = Math.Max(best, hj * (i - j)); // hj could stretch from j up to i
                start = j; // the new bar can reach back as far
            }
            stack.Push((start, h));
        }
        return best;
    }
}
