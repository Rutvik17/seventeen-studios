public class Solution {
    public int EvalRPN(string[] tokens) {
        var stack = new Stack<int>();
        foreach (string tok in tokens) {
            if (tok is "+" or "-" or "*" or "/") {
                int b = stack.Pop(), a = stack.Pop(); // the right operand is on top
                stack.Push(tok switch {
                    "+" => a + b,
                    "-" => a - b,
                    "*" => a * b,
                    _ => a / b, // truncates toward zero
                });
            } else stack.Push(int.Parse(tok));
        }
        return stack.Pop();
    }
}
