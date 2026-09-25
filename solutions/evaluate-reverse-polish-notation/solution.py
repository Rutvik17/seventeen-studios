class Solution:
    def evalRPN(self, tokens: List[str]) -> int:
        stack = []
        for tok in tokens:
            if tok in "+-*/":
                b, a = stack.pop(), stack.pop()  # the right operand is on top
                if tok == "+":
                    stack.append(a + b)
                elif tok == "-":
                    stack.append(a - b)
                elif tok == "*":
                    stack.append(a * b)
                else:
                    stack.append(int(a / b))  # division truncates toward zero
            else:
                stack.append(int(tok))
        return stack[0]
