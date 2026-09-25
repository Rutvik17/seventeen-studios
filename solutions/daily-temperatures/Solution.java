class Solution {
    public int[] dailyTemperatures(int[] temperatures) {
        int n = temperatures.length;
        int[] out = new int[n];
        int[] stack = new int[n]; // days still waiting for a warmer one
        int top = 0;
        for (int i = 0; i < n; i++) {
            while (top > 0 && temperatures[stack[top - 1]] < temperatures[i]) {
                int j = stack[--top];
                out[j] = i - j; // day i is the first warmer day after day j
            }
            stack[top++] = i;
        }
        return out;
    }
}
