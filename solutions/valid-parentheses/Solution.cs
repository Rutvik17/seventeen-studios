public class Solution {
    public bool IsValid(string s) {
        var stack = new Stack<char>(); // the closers we expect, most recent on top
        foreach (char c in s) {
            if (c == '(') stack.Push(')');
            else if (c == '[') stack.Push(']');
            else if (c == '{') stack.Push('}');
            else if (stack.Count == 0 || stack.Pop() != c) return false;
        }
        return stack.Count == 0;
    }
}
