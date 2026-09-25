class MinStack:
    def __init__(self):
        self.stack = []  # each entry: (value, smallest value at or below it)

    def push(self, val: int) -> None:
        smallest = min(val, self.stack[-1][1]) if self.stack else val
        self.stack.append((val, smallest))

    def pop(self) -> None:
        self.stack.pop()

    def top(self) -> int:
        return self.stack[-1][0]

    def getMin(self) -> int:
        return self.stack[-1][1]
