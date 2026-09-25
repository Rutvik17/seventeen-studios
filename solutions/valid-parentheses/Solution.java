class Solution {
    public boolean isValid(String s) {
        Deque<Character> stack = new ArrayDeque<>(); // openers still waiting for their closer
        for (char c : s.toCharArray()) {
            if (c == '(') stack.push(')');
            else if (c == '[') stack.push(']');
            else if (c == '{') stack.push('}');
            else if (stack.isEmpty() || stack.pop() != c) return false; // push the closer we expect
        }
        return stack.isEmpty();
    }
}
