class Solution:
    def largestRectangleArea(self, heights: List[int]) -> int:
        stack = []  # (start index, height); heights increase upward
        best = 0
        for i, h in enumerate(heights + [0]):  # a final 0 flushes the stack
            start = i
            while stack and stack[-1][1] >= h:
                j, hj = stack.pop()
                best = max(best, hj * (i - j))  # hj could stretch from j up to i
                start = j  # the new bar can reach back as far as the popped one did
            stack.append((start, h))
        return best
