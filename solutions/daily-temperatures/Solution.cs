public class Solution {
    public int[] DailyTemperatures(int[] temperatures) {
        var output = new int[temperatures.Length];
        var stack = new Stack<int>(); // days still waiting for a warmer one
        for (int i = 0; i < temperatures.Length; i++) {
            while (stack.Count > 0 && temperatures[stack.Peek()] < temperatures[i]) {
                int j = stack.Pop();
                output[j] = i - j; // day i is the first warmer day after day j
            }
            stack.Push(i);
        }
        return output;
    }
}
