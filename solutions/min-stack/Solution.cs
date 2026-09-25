public class MinStack {
    private readonly Stack<(int val, int min)> stack = new(); // value, smallest at or below

    public MinStack() {}

    public void Push(int val) {
        int smallest = stack.Count == 0 ? val : Math.Min(val, stack.Peek().min);
        stack.Push((val, smallest));
    }

    public void Pop() => stack.Pop();

    public int Top() => stack.Peek().val;

    public int GetMin() => stack.Peek().min;
}
