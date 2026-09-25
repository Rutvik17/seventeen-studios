class MinStack {
    private final Deque<int[]> stack = new ArrayDeque<>(); // {value, smallest at or below}

    public MinStack() {}

    public void push(int val) {
        int smallest = stack.isEmpty() ? val : Math.min(val, stack.peek()[1]);
        stack.push(new int[] { val, smallest });
    }

    public void pop() { stack.pop(); }

    public int top() { return stack.peek()[0]; }

    public int getMin() { return stack.peek()[1]; }
}
